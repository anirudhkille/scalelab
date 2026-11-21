import { describe, expect, it } from "vitest";

import { asNodeId, type NodeId } from "@/features/architecture";
import type { ChallengeRequirements } from "@/features/challenges";
import { detectFailure, type NodeSnapshot, type RunMetrics } from "@/features/simulation";

const requirements: ChallengeRequirements = {
  targetUsers: 1_000,
  requestsPerUserPerSec: 1,
  readRatio: 0.5,
  staticRatio: 0.2,
  workingSetGb: 10,
  dataSizeGb: 50,
  latencyP95Ms: 300,
  maxErrorRatio: 0.01,
  monthlyBudgetUsd: 5_000,
};

function snapshot(
  nodeId: string,
  overrides: Partial<Omit<NodeSnapshot, "nodeId">> = {},
): NodeSnapshot {
  return {
    nodeId: asNodeId(nodeId),
    utilizationRatio: 0,
    queueDepth: 0,
    servedRps: 100,
    droppedRps: 0,
    latencyMs: 10,
    ...overrides,
  };
}

function metrics(overrides: Partial<RunMetrics> = {}): RunMetrics {
  return {
    users: 1_000,
    offeredRps: 1_000,
    servedRps: 1_000,
    droppedRps: 0,
    errorRatio: 0,
    averageLatencyMs: 20,
    p95LatencyMs: 40,
    maxUtilizationRatio: 1,
    monthlyCostUsd: 100,
    ...overrides,
  };
}

function order(...ids: string[]): readonly NodeId[] {
  return ids.map(asNodeId);
}

describe("detectFailure", () => {
  it("returns null while the run is healthy", () => {
    expect(
      detectFailure({
        requirements,
        metrics: metrics(),
        nodes: [snapshot("clients"), snapshot("app", { utilizationRatio: 0.6 })],
        order: order("clients", "app"),
      }),
    ).toBeNull();
  });

  it("reports the upstream-most queue overflow", () => {
    const breach = detectFailure({
      requirements,
      metrics: metrics({ droppedRps: 200, errorRatio: 0.2 }),
      nodes: [
        snapshot("clients"),
        snapshot("app", { utilizationRatio: 1, droppedRps: 100, queueDepth: 200 }),
        snapshot("db", { utilizationRatio: 0.8, droppedRps: 100, queueDepth: 50 }),
      ],
      order: order("clients", "app", "db"),
    });

    expect(breach?.reason.type).toBe("queueOverflow");
    expect(breach?.rootCauseNodeId).toBe("app");
  });

  it("attributes an error-rate breach to the saturated upstream node", () => {
    const breach = detectFailure({
      requirements,
      metrics: metrics({ droppedRps: 50, errorRatio: 0.05 }),
      nodes: [
        snapshot("clients"),
        snapshot("lb", { utilizationRatio: 0.99 }),
        snapshot("app", { utilizationRatio: 0.7 }),
      ],
      order: order("clients", "lb", "app"),
    });

    expect(breach).toMatchObject({
      reason: { type: "errorRate", observedRatio: 0.05 },
      rootCauseNodeId: asNodeId("lb"),
    });
  });

  it("attributes a latency breach to the most utilized node when none is saturated", () => {
    const breach = detectFailure({
      requirements,
      metrics: metrics({ p95LatencyMs: 900 }),
      nodes: [
        snapshot("clients"),
        snapshot("lb", { utilizationRatio: 0.6 }),
        snapshot("app", { utilizationRatio: 0.9 }),
      ],
      order: order("clients", "lb", "app"),
    });

    expect(breach).toMatchObject({
      reason: { type: "latencySlo", observedP95Ms: 900 },
      rootCauseNodeId: asNodeId("app"),
    });
  });
});
