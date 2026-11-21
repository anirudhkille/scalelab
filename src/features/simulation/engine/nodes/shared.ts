import {
  scaleTraffic,
  trafficTotal,
  type ArchEdge,
  type LoadBalancerAlgorithm,
  type TrafficRate,
} from "@/features/architecture/model";

import { EPSILON_RPS } from "../constants";
import { distributeTraffic, type TrafficDistribution } from "../traffic";

export type ServedDistribution = {
  readonly distribution: TrafficDistribution;
  readonly droppedRps: number;
};

/** Scale accepted traffic by `servedRps / incomingRps`, then route it. */
export function distributeServed(
  incoming: TrafficRate,
  servedRps: number,
  edges: readonly ArchEdge[],
  algorithm: LoadBalancerAlgorithm = "roundRobin",
): ServedDistribution {
  const incomingRps = trafficTotal(incoming);
  const servedRatio = incomingRps > EPSILON_RPS ? servedRps / incomingRps : 0;
  const servedTraffic = scaleTraffic(incoming, servedRatio);

  return distributeForwarded(servedTraffic, edges, algorithm);
}

/** Route a traffic rate and count unroutable classes as drops. */
export function distributeForwarded(
  traffic: TrafficRate,
  edges: readonly ArchEdge[],
  algorithm: LoadBalancerAlgorithm = "roundRobin",
): ServedDistribution {
  const distribution = distributeTraffic(traffic, edges, algorithm);
  const droppedRps = edges.length > 0 ? trafficTotal(distribution.unrouted) : 0;

  return { distribution, droppedRps };
}
