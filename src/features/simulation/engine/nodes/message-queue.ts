import { QUEUE_BASE_LATENCY_MS } from "../constants";
import { processQueue } from "../queue";
import type { NodeBehavior } from "../types";
import { distributeForwarded } from "./shared";

/**
 * Writes enter the queue and drain at `throughputRps`.
 *
 * Reads and static traffic pass through unchanged. Queue depth grows when
 * workers cannot keep up; writes beyond `maxDepth` are dropped. Users see the
 * low enqueue latency, not the drain latency.
 */
export const messageQueueBehavior: NodeBehavior = (context) => {
  if (context.node.params.kind !== "queue") {
    throw new Error("messageQueueBehavior received a non-queue node");
  }

  const params = context.node.params;
  const writeQueue = processQueue({
    incomingRps: context.incoming.write,
    capacityRps: params.throughputRps,
    queueDepth: context.queueDepth,
    maxQueueDepth: params.maxDepth,
    baseLatencyMs: QUEUE_BASE_LATENCY_MS,
    dtSec: context.dtSec,
  });

  const acceptedWriteRps = Math.max(0, context.incoming.write - writeQueue.droppedRps);
  const { distribution, droppedRps } = distributeForwarded(
    {
      read: context.incoming.read,
      write: writeQueue.servedRps,
      static: context.incoming.static,
    },
    context.outgoingEdges,
  );

  return {
    outputs: distribution.flows,
    servedRps: context.incoming.read + context.incoming.static + acceptedWriteRps,
    droppedRps: writeQueue.droppedRps + droppedRps,
    queueDepth: writeQueue.queueDepth,
    maxQueueDepth: writeQueue.maxQueueDepth,
    utilizationRatio: writeQueue.utilizationRatio,
    latencyMs: QUEUE_BASE_LATENCY_MS,
    capacityRps: writeQueue.capacityRps,
  };
};
