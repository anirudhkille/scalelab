import { trafficTotal } from "@/features/architecture/model";

import {
  SEARCH_INDEX_BASE_LATENCY_MS,
  SEARCH_INDEX_MIN_WRITE_COST_RATIO,
  SEARCH_INDEX_QUEUE_LIMIT_SEC,
} from "../constants";
import { hotKeyCapacityFactor } from "../load-modifiers";
import { processQueue, queueDepthForSeconds } from "../queue";
import type { NodeBehavior } from "../types";
import { distributeForwarded } from "./shared";

/**
 * A search index serves reads from shards but pays for every write twice:
 * the document write plus the inverted-index maintenance. The effective
 * capacity is therefore expressed in request-equivalents, so a write-heavy
 * workload saturates a cluster that looks large on paper.
 */
export const searchIndexBehavior: NodeBehavior = (context) => {
  if (context.node.params.kind !== "searchIndex") {
    throw new Error("searchIndexBehavior received a non-search-index node");
  }

  const params = context.node.params;
  const incomingRps = trafficTotal(context.incoming);
  const writeCostRatio = Math.max(SEARCH_INDEX_MIN_WRITE_COST_RATIO, params.indexingWriteCostRatio);
  const writeAmplification = 1 / writeCostRatio - 1;
  const weightedRps = incomingRps + context.incoming.write * writeAmplification;
  const readCapacityRps =
    params.shards * params.rpsPerShard * hotKeyCapacityFactor(context.loadModifiers, "searchIndex");
  const capacityRps =
    weightedRps > 0 && incomingRps > 0
      ? readCapacityRps * (incomingRps / weightedRps)
      : readCapacityRps;

  const queue = processQueue({
    incomingRps,
    capacityRps,
    queueDepth: context.queueDepth,
    maxQueueDepth: queueDepthForSeconds(capacityRps, SEARCH_INDEX_QUEUE_LIMIT_SEC),
    baseLatencyMs: SEARCH_INDEX_BASE_LATENCY_MS,
    dtSec: context.dtSec,
  });

  const acceptedRatio = incomingRps > 0 ? queue.servedRps / incomingRps : 0;
  const { distribution, droppedRps } = distributeForwarded(
    {
      read: context.incoming.read * acceptedRatio,
      write: context.incoming.write * acceptedRatio,
      static: context.incoming.static * acceptedRatio,
    },
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
