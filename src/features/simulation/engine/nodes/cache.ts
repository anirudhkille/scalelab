import { clampRatio, trafficTotal, type TrafficRate } from "@/features/architecture/model";

import {
  CACHE_BASE_LATENCY_MS,
  CACHE_CAPACITY_RPS,
  CACHE_HIT_RATIO_CEILING,
  CACHE_HIT_RATIO_EXPONENT,
  CACHE_QUEUE_LIMIT_SEC,
  CACHE_WARMUP_SEC,
  CACHE_WRITE_BACK_FLUSH_RATIO,
  CACHE_WRITE_BACK_LATENCY_MS,
  CACHE_WRITE_THROUGH_LATENCY_MS,
} from "../constants";
import { cacheWarmupTimeSec, hotKeyCapacityFactor } from "../load-modifiers";
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
  const capacityRps = CACHE_CAPACITY_RPS * hotKeyCapacityFactor(context.loadModifiers, "cache");
  const queue = processQueue({
    incomingRps,
    capacityRps,
    queueDepth: context.queueDepth,
    maxQueueDepth: queueDepthForSeconds(capacityRps, CACHE_QUEUE_LIMIT_SEC),
    baseLatencyMs: CACHE_BASE_LATENCY_MS,
    dtSec: context.dtSec,
  });

  const hitRatio = cacheHitRatioAtTime(
    params.memoryGb,
    context.requirements.workingSetGb,
    cacheWarmupTimeSec(context.loadModifiers, context.timeSec),
  );
  const acceptedRatio = incomingRps > 0 ? queue.servedRps / incomingRps : 0;
  const accepted: TrafficRate = {
    read: context.incoming.read * acceptedRatio,
    write: context.incoming.write * acceptedRatio,
    static: context.incoming.static * acceptedRatio,
  };

  const hitReadRps = accepted.read * hitRatio;
  const writeForwardRatio = params.writeStrategy === "writeBack" ? CACHE_WRITE_BACK_FLUSH_RATIO : 1;
  const forwarded: TrafficRate = {
    read: accepted.read - hitReadRps,
    write: accepted.write * writeForwardRatio,
    static: accepted.static,
  };
  const { distribution, droppedRps } = distributeForwarded(forwarded, context.outgoingEdges);
  const strategyLatencyMs =
    params.writeStrategy === "writeThrough"
      ? CACHE_WRITE_THROUGH_LATENCY_MS
      : params.writeStrategy === "writeBack"
        ? CACHE_WRITE_BACK_LATENCY_MS
        : 0;

  return {
    outputs: distribution.flows,
    servedRps: queue.servedRps,
    droppedRps: queue.droppedRps + droppedRps,
    queueDepth: queue.queueDepth,
    maxQueueDepth: queue.maxQueueDepth,
    utilizationRatio: queue.utilizationRatio,
    latencyMs: queue.latencyMs + strategyLatencyMs,
    capacityRps: queue.capacityRps,
    hitRatio,
  };
};
