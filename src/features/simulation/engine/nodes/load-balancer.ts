import { trafficTotal } from "@/features/architecture/model";

import { LOAD_BALANCER_QUEUE_LIMIT_SEC } from "../constants";
import { processQueue, queueDepthForSeconds } from "../queue";
import type { NodeBehavior } from "../types";
import { distributeServed } from "./shared";

export const loadBalancerBehavior: NodeBehavior = (context) => {
  if (context.node.params.kind !== "loadBalancer") {
    throw new Error("loadBalancerBehavior received a non-load-balancer node");
  }

  const params = context.node.params;
  const capacityRps = Math.max(0, params.capacityRps);
  const incomingRps = trafficTotal(context.incoming);
  const queue = processQueue({
    incomingRps,
    capacityRps,
    queueDepth: context.queueDepth,
    maxQueueDepth: queueDepthForSeconds(capacityRps, LOAD_BALANCER_QUEUE_LIMIT_SEC),
    baseLatencyMs: 1,
    dtSec: context.dtSec,
  });

  const { distribution, droppedRps } = distributeServed(
    context.incoming,
    queue.servedRps,
    context.outgoingEdges,
    params.algorithm,
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
