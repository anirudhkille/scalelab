import { clampRatio } from "@/features/architecture";

import { P95_UTILIZATION_EXPONENT, P95_UTILIZATION_MULTIPLIER } from "./constants";
import type { NodeSnapshot, RunMetrics } from "../types";

export type MetricsInput = {
  readonly users: number;
  readonly offeredRps: number;
  readonly nodes: readonly NodeSnapshot[];
  readonly monthlyCostUsd: number;
};

/**
 * Turn one tick of node snapshots into the run-level metrics shown in the UI.
 *
 * Dropped traffic is taken from the worst node rather than summed, because the
 * same requests can be dropped at more than one bottleneck in a synthetic run.
 */
export function computeRunMetrics(input: MetricsInput): RunMetrics {
  const offeredRps = Math.max(0, input.offeredRps);
  const droppedRps = input.nodes.reduce((worst, node) => Math.max(worst, node.droppedRps), 0);
  const servedRps = Math.max(0, offeredRps - droppedRps);
  const maxUtilizationRatio = input.nodes.reduce(
    (worst, node) => Math.max(worst, node.utilizationRatio),
    0,
  );

  const latencyWeight = input.nodes.reduce((total, node) => total + Math.max(0, node.servedRps), 0);
  const averageLatencyMs =
    latencyWeight > 0
      ? input.nodes.reduce(
          (total, node) => total + node.latencyMs * Math.max(0, node.servedRps),
          0,
        ) / latencyWeight
      : 0;

  const p95LatencyMs =
    averageLatencyMs *
    (1 + P95_UTILIZATION_MULTIPLIER * Math.pow(maxUtilizationRatio, P95_UTILIZATION_EXPONENT));

  return {
    users: Math.max(0, input.users),
    offeredRps,
    servedRps,
    droppedRps,
    errorRatio: clampRatio(offeredRps > 0 ? droppedRps / offeredRps : 0),
    averageLatencyMs,
    p95LatencyMs,
    maxUtilizationRatio,
    monthlyCostUsd: input.monthlyCostUsd,
  };
}
