import { trafficTotal, type NodeKind } from "@/features/architecture";

import { EPSILON_RPS, PLACEHOLDER_LATENCY_MS } from "../constants";
import { processQueue, queueDepthForSeconds } from "../queue";
import type { NodeBehavior } from "../types";
import { distributeForwarded } from "./shared";

type PassThroughKind = "dns" | "apiGateway" | "rateLimiter" | "objectStorage";

const PASS_THROUGH_KINDS: ReadonlySet<NodeKind> = new Set([
  "dns",
  "apiGateway",
  "rateLimiter",
  "objectStorage",
]);

function isPassThroughKind(kind: NodeKind): kind is PassThroughKind {
  return PASS_THROUGH_KINDS.has(kind);
}

function baseLatencyMs(kind: PassThroughKind): number {
  switch (kind) {
    case "dns":
      return PLACEHOLDER_LATENCY_MS.dns;
    case "apiGateway":
      return PLACEHOLDER_LATENCY_MS.apiGateway;
    case "rateLimiter":
      return PLACEHOLDER_LATENCY_MS.rateLimiter;
    case "objectStorage":
      return PLACEHOLDER_LATENCY_MS.objectStorage;
  }
}

function finiteCapacityRps(kind: PassThroughKind, nodeCapacity: number | null): number | null {
  switch (kind) {
    case "apiGateway":
    case "rateLimiter":
      return nodeCapacity;
    case "dns":
    case "objectStorage":
      return null;
  }
}

/**
 * Remaining low-detail nodes.
 *
 * DNS and object storage are effectively unlimited. Gateway and rate limiter
 * enforce `limitRps` and drop excess traffic.
 */
export const passThroughBehavior: NodeBehavior = (context) => {
  const kind = context.node.params.kind;
  if (!isPassThroughKind(kind)) {
    throw new Error(`passThroughBehavior received unsupported node kind: ${kind}`);
  }

  const incomingRps = trafficTotal(context.incoming);
  const limitRps =
    context.node.params.kind === "apiGateway" || context.node.params.kind === "rateLimiter"
      ? context.node.params.limitRps
      : null;
  const capacity = finiteCapacityRps(kind, limitRps);
  const latencyMs = baseLatencyMs(kind);

  if (capacity === null) {
    const { distribution, droppedRps } = distributeForwarded(
      context.incoming,
      context.outgoingEdges,
    );

    return {
      outputs: distribution.flows,
      servedRps: incomingRps,
      droppedRps,
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
  const accepted = {
    read: context.incoming.read * servedRatio,
    write: context.incoming.write * servedRatio,
    static: context.incoming.static * servedRatio,
  };
  const { distribution, droppedRps } = distributeForwarded(accepted, context.outgoingEdges);

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
