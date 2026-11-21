import { trafficTotal } from "@/features/architecture/model";

import { distributeTraffic } from "../traffic";
import type { NodeBehavior } from "../types";

/**
 * The traffic source. It owns no queue and emits the whole offered load.
 */
export const clientsBehavior: NodeBehavior = (context) => {
  const offeredRps = trafficTotal(context.incoming);
  const distribution = distributeTraffic(context.incoming, context.outgoingEdges, "roundRobin");
  const unroutedRps = trafficTotal(distribution.unrouted);

  return {
    outputs: distribution.flows,
    servedRps: offeredRps,
    droppedRps: unroutedRps,
    queueDepth: 0,
    maxQueueDepth: 0,
    utilizationRatio: 0,
    latencyMs: 0,
    capacityRps: Number.POSITIVE_INFINITY,
  };
};
