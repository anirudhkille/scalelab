import { scaleTraffic, trafficTotal, type ArchNode, type NodeKind } from "@/features/architecture";

import { EPSILON_RPS, PLACEHOLDER_LATENCY_MS } from "../constants";
import { processQueue, queueDepthForSeconds } from "../queue";
import { distributeTraffic } from "../traffic";
import type { NodeBehavior } from "../types";

function baseLatencyMs(kind: NodeKind): number {
  switch (kind) {
    case "dns":
      return PLACEHOLDER_LATENCY_MS.dns;
    case "cdn":
      return PLACEHOLDER_LATENCY_MS.cdn;
    case "apiGateway":
      return PLACEHOLDER_LATENCY_MS.apiGateway;
    case "rateLimiter":
      return PLACEHOLDER_LATENCY_MS.rateLimiter;
    case "cache":
      return PLACEHOLDER_LATENCY_MS.cache;
    case "database":
      return PLACEHOLDER_LATENCY_MS.database;
    case "queue":
      return PLACEHOLDER_LATENCY_MS.queue;
    case "worker":
      return PLACEHOLDER_LATENCY_MS.worker;
    case "objectStorage":
      return PLACEHOLDER_LATENCY_MS.objectStorage;
    case "clients":
    case "loadBalancer":
    case "appServer":
      return 0;
  }
}

function finiteCapacityRps(node: ArchNode): number | null {
  switch (node.params.kind) {
    case "apiGateway":
      return node.params.limitRps;
    case "rateLimiter":
      return node.params.limitRps;
    default:
      return null;
  }
}

/**
 * M1 placeholder behavior for kinds that get a full model in M2.
 *
 * Gateway and rate limiter already enforce their capacity. Everything else is
 * an unlimited pass-through with a representative latency so designs remain
 * runnable while the deeper behaviors are built.
 */
export const passThroughBehavior: NodeBehavior = (context) => {
  const incomingRps = trafficTotal(context.incoming);
  const capacity = finiteCapacityRps(context.node);
  const latencyMs = baseLatencyMs(context.node.params.kind);

  if (capacity === null) {
    const distribution = distributeTraffic(context.incoming, context.outgoingEdges, "roundRobin");
    const unroutedRps = context.outgoingEdges.length > 0 ? trafficTotal(distribution.unrouted) : 0;

    return {
      outputs: distribution.flows,
      servedRps: incomingRps,
      droppedRps: unroutedRps,
      queueDepth: 0,
      maxQueueDepth: 0,
      utilizationRatio: 0,
      latencyMs,
      capacityRps: Number.POSITIVE_INFINITY,
    };
  }

  const queue = processQueue({
    incomingRps,
    capacityRps: capacity,
    queueDepth: context.queueDepth,
    maxQueueDepth: queueDepthForSeconds(capacity, 1),
    baseLatencyMs: latencyMs,
    dtSec: context.dtSec,
  });

  const servedRatio = incomingRps > EPSILON_RPS ? queue.servedRps / incomingRps : 0;
  const servedTraffic = scaleTraffic(context.incoming, servedRatio);
  const distribution = distributeTraffic(servedTraffic, context.outgoingEdges, "roundRobin");
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
