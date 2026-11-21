import {
  TRAFFIC_CLASSES,
  ZERO_TRAFFIC,
  addTraffic,
  type ArchEdge,
  type LoadBalancerAlgorithm,
  type TrafficClass,
  type TrafficRate,
} from "@/features/architecture";

import { IP_HASH_SKEW_RATIO } from "./constants";
import type { EdgeFlow } from "./types";

export type TrafficDistribution = {
  readonly flows: readonly EdgeFlow[];
  readonly routed: TrafficRate;
  readonly unrouted: TrafficRate;
};

function edgeCarries(edge: ArchEdge, trafficClass: TrafficClass): boolean {
  return !edge.carries || edge.carries.includes(trafficClass);
}

function eligibleEdges(
  edges: readonly ArchEdge[],
  trafficClass: TrafficClass,
): readonly ArchEdge[] {
  return edges.filter((edge) => edgeCarries(edge, trafficClass));
}

function edgeShares(
  edges: readonly ArchEdge[],
  algorithm: LoadBalancerAlgorithm,
): readonly number[] {
  if (edges.length === 0) {
    return [];
  }

  if (algorithm === "ipHash") {
    const count = edges.length;
    if (count === 1) {
      return [1];
    }

    const baseShare = 1 / count;
    const firstShare = baseShare + IP_HASH_SKEW_RATIO * (1 - baseShare);
    const otherShare = (1 - firstShare) / (count - 1);

    return edges.map((_, index) => (index === 0 ? firstShare : otherShare));
  }

  const weights = edges.map((edge) => Math.max(0, edge.weight ?? 1));
  const totalWeight = weights.reduce((total, weight) => total + weight, 0);

  if (totalWeight <= 0) {
    return edges.map(() => 1 / edges.length);
  }

  return weights.map((weight) => weight / totalWeight);
}

/**
 * Split traffic across outgoing edges, honoring per-edge traffic classes.
 *
 * Classes with no eligible edge are returned as `unrouted` so the caller can
 * count them as dropped work instead of silently losing them.
 */
export function distributeTraffic(
  rate: TrafficRate,
  edges: readonly ArchEdge[],
  algorithm: LoadBalancerAlgorithm = "roundRobin",
): TrafficDistribution {
  if (edges.length === 0) {
    return { flows: [], routed: ZERO_TRAFFIC, unrouted: rate };
  }

  const flowByEdge = new Map<ArchEdge["id"], { read: number; write: number; static: number }>();
  for (const edge of edges) {
    flowByEdge.set(edge.id, { read: 0, write: 0, static: 0 });
  }

  let routed: TrafficRate = ZERO_TRAFFIC;

  for (const trafficClass of TRAFFIC_CLASSES) {
    const classRate = Math.max(0, rate[trafficClass]);
    if (classRate <= 0) {
      continue;
    }

    const eligible = eligibleEdges(edges, trafficClass);
    if (eligible.length === 0) {
      continue;
    }

    const shares = edgeShares(eligible, algorithm);
    const routedToEligible = eligible.reduce((total, edge, index) => {
      const share = shares[index] ?? 0;
      const flow = flowByEdge.get(edge.id);
      if (!flow) {
        return total;
      }

      flow[trafficClass] += classRate * share;
      return total + classRate * share;
    }, 0);

    routed = addTraffic(routed, {
      read: trafficClass === "read" ? routedToEligible : 0,
      write: trafficClass === "write" ? routedToEligible : 0,
      static: trafficClass === "static" ? routedToEligible : 0,
    });
  }

  const unrouted: TrafficRate = {
    read: Math.max(0, rate.read - routed.read),
    write: Math.max(0, rate.write - routed.write),
    static: Math.max(0, rate.static - routed.static),
  };

  const flows: EdgeFlow[] = [];
  for (const edge of edges) {
    const flow = flowByEdge.get(edge.id);
    if (!flow) {
      continue;
    }

    const edgeRate: TrafficRate = {
      read: flow.read,
      write: flow.write,
      static: flow.static,
    };

    if (edgeRate.read + edgeRate.write + edgeRate.static > 0) {
      flows.push({ edgeId: edge.id, rate: edgeRate });
    }
  }

  return { flows, routed, unrouted };
}
