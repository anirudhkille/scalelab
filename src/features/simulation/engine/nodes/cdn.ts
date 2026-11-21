import { trafficTotal, type TrafficRate } from "@/features/architecture";

import { CDN_BASE_LATENCY_MS, CDN_CAPACITY_RPS, CDN_QUEUE_LIMIT_SEC } from "../constants";
import { processQueue, queueDepthForSeconds } from "../queue";
import type { NodeBehavior } from "../types";
import { distributeForwarded } from "./shared";

export const cdnBehavior: NodeBehavior = (context) => {
  if (context.node.params.kind !== "cdn") {
    throw new Error("cdnBehavior received a non-CDN node");
  }

  const params = context.node.params;
  const incomingRps = trafficTotal(context.incoming);
  const queue = processQueue({
    incomingRps,
    capacityRps: CDN_CAPACITY_RPS,
    queueDepth: context.queueDepth,
    maxQueueDepth: queueDepthForSeconds(CDN_CAPACITY_RPS, CDN_QUEUE_LIMIT_SEC),
    baseLatencyMs: CDN_BASE_LATENCY_MS,
    dtSec: context.dtSec,
  });

  const acceptedRatio = incomingRps > 0 ? queue.servedRps / incomingRps : 0;
  const accepted: TrafficRate = {
    read: context.incoming.read * acceptedRatio,
    write: context.incoming.write * acceptedRatio,
    static: context.incoming.static * acceptedRatio,
  };

  const staticHitRps = accepted.static * params.hitRatio;
  const forwarded: TrafficRate = {
    read: accepted.read,
    write: accepted.write,
    static: accepted.static - staticHitRps,
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
    hitRatio: params.hitRatio,
  };
};
