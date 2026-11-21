import { trafficTotal } from "@/features/architecture/model";

import { EPSILON_RPS, PLACEHOLDER_LATENCY_MS } from "../constants";
import type { NodeBehavior } from "../types";
import { distributeForwarded } from "./shared";

/**
 * A rate limiter rejects excess requests immediately.
 *
 * Unlike an API gateway, which queues a short burst, the limiter's whole job is
 * to shed load at the edge so downstream work never sees it. Excess requests
 * still count as errors; that is the tradeoff the design is making.
 */
export const rateLimiterBehavior: NodeBehavior = (context) => {
  if (context.node.params.kind !== "rateLimiter") {
    throw new Error("rateLimiterBehavior received a non-rate-limiter node");
  }

  const incomingRps = trafficTotal(context.incoming);
  const limitRps = context.node.params.limitRps;
  const servedRps = Math.min(incomingRps, limitRps);
  const servedRatio = incomingRps > EPSILON_RPS ? servedRps / incomingRps : 0;
  const { distribution, droppedRps } = distributeForwarded(
    {
      read: context.incoming.read * servedRatio,
      write: context.incoming.write * servedRatio,
      static: context.incoming.static * servedRatio,
    },
    context.outgoingEdges,
  );

  return {
    outputs: distribution.flows,
    servedRps,
    droppedRps: incomingRps - servedRps + droppedRps,
    queueDepth: 0,
    maxQueueDepth: 0,
    utilizationRatio: Math.min(1, incomingRps / limitRps),
    latencyMs: PLACEHOLDER_LATENCY_MS.rateLimiter,
    capacityRps: limitRps,
  };
};
