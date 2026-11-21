import { EPSILON_RPS, MIN_QUEUE_DEPTH } from "./constants";

export type QueueProcessInput = {
  readonly incomingRps: number;
  readonly capacityRps: number;
  readonly queueDepth: number;
  readonly maxQueueDepth: number;
  readonly baseLatencyMs: number;
  readonly dtSec: number;
};

export type QueueProcessResult = {
  readonly capacityRps: number;
  readonly servedRps: number;
  readonly droppedRps: number;
  readonly queueDepth: number;
  readonly maxQueueDepth: number;
  readonly utilizationRatio: number;
  readonly latencyMs: number;
};

/** Convert "seconds of work" into queue capacity in requests. */
export function queueDepthForSeconds(capacityRps: number, seconds: number): number {
  return Math.max(MIN_QUEUE_DEPTH, Math.max(0, capacityRps) * Math.max(0, seconds));
}

/**
 * Process one tick for a generic work queue.
 *
 * Traffic is fluid: `incomingRps * dt` requests arrive, the node processes up
 * to `capacityRps * dt`, and anything above the queue limit is dropped.
 */
export function processQueue(input: QueueProcessInput): QueueProcessResult {
  const dtSec = Math.max(0, input.dtSec);
  const capacityRps = Math.max(0, input.capacityRps);
  const incomingRps = Math.max(0, input.incomingRps);
  const queueDepth = Math.max(0, input.queueDepth);
  const maxQueueDepth = Math.max(0, input.maxQueueDepth);

  const backlog = queueDepth + incomingRps * dtSec;
  const processable = capacityRps * dtSec;
  const servedRequests = Math.min(backlog, processable);
  const remaining = backlog - servedRequests;
  const overflow = Math.max(0, remaining - maxQueueDepth);
  const nextQueueDepth = remaining - overflow;

  const servedRps = dtSec > EPSILON_RPS ? servedRequests / dtSec : 0;
  const droppedRps = dtSec > EPSILON_RPS ? overflow / dtSec : 0;
  const utilizationRatio =
    capacityRps > EPSILON_RPS
      ? Math.min(1, incomingRps / capacityRps)
      : incomingRps > EPSILON_RPS
        ? 1
        : 0;

  const queueWaitMs = capacityRps > EPSILON_RPS ? (nextQueueDepth / capacityRps) * 1000 : 0;

  return {
    capacityRps,
    servedRps,
    droppedRps,
    queueDepth: nextQueueDepth,
    maxQueueDepth,
    utilizationRatio,
    latencyMs: Math.max(0, input.baseLatencyMs) + queueWaitMs,
  };
}
