import { trafficTotal } from "@/features/architecture";

import { APP_SERVER_QUEUE_LIMIT_SEC, STATEFUL_SESSION_PENALTY_RATIO } from "../constants";
import { processQueue, queueDepthForSeconds } from "../queue";
import type { NodeBehavior, NodeBehaviorContext } from "../types";
import { distributeServed } from "./shared";

function hasRoundRobinLoadBalancer(context: NodeBehaviorContext): boolean {
  return context.upstreamNodes.some(
    (node) => node.params.kind === "loadBalancer" && node.params.algorithm === "roundRobin",
  );
}

export const appServerBehavior: NodeBehavior = (context) => {
  if (context.node.params.kind !== "appServer") {
    throw new Error("appServerBehavior received a non-app-server node");
  }

  const params = context.node.params;
  const sessionPenalty =
    params.statefulSessions && hasRoundRobinLoadBalancer(context)
      ? STATEFUL_SESSION_PENALTY_RATIO
      : 1;
  const capacityRps = Math.max(0, params.instances * params.rpsPerInstance * sessionPenalty);
  const incomingRps = trafficTotal(context.incoming);
  const queue = processQueue({
    incomingRps,
    capacityRps,
    queueDepth: context.queueDepth,
    maxQueueDepth: queueDepthForSeconds(capacityRps, APP_SERVER_QUEUE_LIMIT_SEC),
    baseLatencyMs: params.baseLatencyMs,
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
