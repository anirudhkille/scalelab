import { trafficTotal } from "@/features/architecture/model";

import { WORKER_BASE_LATENCY_MS, WORKER_QUEUE_LIMIT_SEC } from "../constants";
import { processQueue, queueDepthForSeconds } from "../queue";
import type { NodeBehavior } from "../types";
import { distributeServed } from "./shared";

export const workerBehavior: NodeBehavior = (context) => {
  if (context.node.params.kind !== "worker") {
    throw new Error("workerBehavior received a non-worker node");
  }

  const params = context.node.params;
  const capacityRps = Math.max(0, params.instances * params.rpsPerInstance);
  const incomingRps = trafficTotal(context.incoming);
  const queue = processQueue({
    incomingRps,
    capacityRps,
    queueDepth: context.queueDepth,
    maxQueueDepth: queueDepthForSeconds(capacityRps, WORKER_QUEUE_LIMIT_SEC),
    baseLatencyMs: WORKER_BASE_LATENCY_MS,
    dtSec: context.dtSec,
  });

  const { distribution, droppedRps } = distributeServed(
    context.incoming,
    queue.servedRps,
    context.outgoingEdges,
  );

  return {
    outputs: distribution.flows,
    servedRps: queue.servedRps,
    droppedRps: queue.droppedRps + droppedRps,
    queueDepth: queue.queueDepth,
    maxQueueDepth: queue.maxQueueDepth,
    utilizationRatio: queue.utilizationRatio,
    latencyMs: queue.latencyMs,
    capacityRps: queue.capacityRps,
  };
};
