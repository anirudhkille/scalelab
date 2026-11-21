import { scaleTraffic, trafficTotal } from "@/features/architecture";

import { EPSILON_RPS, LOAD_BALANCER_QUEUE_LIMIT_SEC } from "../constants";
import { processQueue, queueDepthForSeconds } from "../queue";
import { distributeTraffic } from "../traffic";
import type { NodeBehavior } from "../types";

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

  const servedRatio = incomingRps > EPSILON_RPS ? queue.servedRps / incomingRps : 0;
  const servedTraffic = scaleTraffic(context.incoming, servedRatio);
  const distribution = distributeTraffic(servedTraffic, context.outgoingEdges, params.algorithm);
  const unroutedRps = context.outgoingEdges.length > 0 ? trafficTotal(distribution.unrouted) : 0;

  return {
    outputs: distribution.flows,
    servedRps: queue.servedRps,
    droppedRps: queue.droppedRps + unroutedRps,
    queueDepth: queue.queueDepth,
    maxQueueDepth: queue.maxQueueDepth,
    utilizationRatio: queue.utilizationRatio,
    latencyMs: queue.latencyMs,
    capacityRps: queue.capacityRps,
  };
};
