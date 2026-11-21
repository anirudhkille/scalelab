import { clampRatio, trafficTotal, type TrafficRate } from "@/features/architecture/model";

import {
  CACHE_BASE_LATENCY_MS,
  CACHE_CAPACITY_RPS,
  CACHE_HIT_RATIO_CEILING,
  CACHE_HIT_RATIO_EXPONENT,
  CACHE_QUEUE_LIMIT_SEC,
  CACHE_WARMUP_SEC,
} from "../constants";
import { processQueue, queueDepthForSeconds } from "../queue";
import type { NodeBehavior } from "../types";
import { distributeForwarded } from "./shared";

/**
 * Steady-state cache hit ratio.
 *
 * `clamp(memoryGb / workingSetGb, 0, 1) ^ 0.6 * 0.98`
 *
 * The exponent models diminishing returns: doubling memory does not double
 * hits. The 0.98 ceiling keeps a non-zero miss path so the database still
 * matters even for an oversized cache.
 */
export function cacheSteadyHitRatio(memoryGb: number, workingSetGb: number): number {
  if (workingSetGb <= 0) {
    return CACHE_HIT_RATIO_CEILING;
  }

  const coverageRatio = clampRatio(memoryGb / workingSetGb);
  return Math.pow(coverageRatio, CACHE_HIT_RATIO_EXPONENT) * CACHE_HIT_RATIO_CEILING;
}

/** Cold caches ramp linearly from zero to steady state over `CACHE_WARMUP_SEC`. */
export function cacheHitRatioAtTime(
  memoryGb: number,
  workingSetGb: number,
  timeSec: number,
): number {
  const warmupRatio = clampRatio(timeSec / CACHE_WARMUP_SEC);
  return cacheSteadyHitRatio(memoryGb, workingSetGb) * warmupRatio;
}

export const cacheBehavior: NodeBehavior = (context) => {
  if (context.node.params.kind !== "cache") {
    throw new Error("cacheBehavior received a non-cache node");
  }

  const params = context.node.params;
  const incomingRps = trafficTotal(context.incoming);
  const queue = processQueue({
    incomingRps,
    capacityRps: CACHE_CAPACITY_RPS,
    queueDepth: context.queueDepth,
    maxQueueDepth: queueDepthForSeconds(CACHE_CAPACITY_RPS, CACHE_QUEUE_LIMIT_SEC),
    baseLatencyMs: CACHE_BASE_LATENCY_MS,
    dtSec: context.dtSec,
  });

  const hitRatio = cacheHitRatioAtTime(
    params.memoryGb,
    context.requirements.workingSetGb,
    context.timeSec,
  );
  const acceptedRatio = incomingRps > 0 ? queue.servedRps / incomingRps : 0;
  const accepted: TrafficRate = {
    read: context.incoming.read * acceptedRatio,
    write: context.incoming.write * acceptedRatio,
    static: context.incoming.static * acceptedRatio,
  };

  const hitReadRps = accepted.read * hitRatio;
  const forwarded: TrafficRate = {
    read: accepted.read - hitReadRps,
    write: accepted.write,
    static: accepted.static,
  };
  const { distribution, droppedRps } = distributeForwarded(forwarded, context.outgoingEdges);

  return {
    outputs: distribution.flows,
    servedRps: queue.servedRps,
    droppedRps: queue.droppedRps + droppedRps,
    queueDepth: queue.queueDepth,
    maxQueueDepth: queue.maxQueueDepth,
    utilizationRatio: queue.utilizationRatio,
    latencyMs: queue.latencyMs,
    capacityRps: queue.capacityRps,
    hitRatio,
  };
};
