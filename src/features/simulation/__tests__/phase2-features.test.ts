import { describe, expect, it } from "vitest";

import {
  asEdgeId,
  asNodeId,
  defaultComponentParams,
  type ArchEdge,
  type ArchNode,
  type Architecture,
  type ComponentParamsByKind,
  type NodeKind,
} from "@/features/architecture";
import type { ChallengeRequirements } from "@/features/challenges";
import {
  applyFailureEffect,
  databaseReplicationLagMs,
  failureEffectFor,
  runSimulation,
  type NodeBehaviorResult,
} from "@/features/simulation";

import { cacheBehavior } from "../engine/nodes/cache";

const requirements: ChallengeRequirements = {
  targetUsers: 100,
  requestsPerUserPerSec: 1,
  readRatio: 0.8,
  staticRatio: 0,
  workingSetGb: 10,
  dataSizeGb: 5,
  latencyP95Ms: 250,
  maxErrorRatio: 0.01,
  availabilityRatio: 0.99,
  monthlyBudgetUsd: 1_000,
};

function node<T extends NodeKind>(
  id: string,
  kind: T,
  params: ComponentParamsByKind[T] = defaultComponentParams(kind) as ComponentParamsByKind[T],
  zone: "a" | "b" | "c" = "a",
): ArchNode {
  return {
    id: asNodeId(id),
    label: id,
    position: { x: 0, y: 0 },
    region: "us-east",
    zone,
    params,
  };
}

function edge(source: string, target: string): ArchEdge {
  return {
    id: asEdgeId(`${source}-${target}`),
    source: asNodeId(source),
    target: asNodeId(target),
  };
}

function architecture(): Architecture {
  return {
    nodes: [
      node("clients", "clients"),
      node("app", "appServer", {
        kind: "appServer",
        instances: 1,
        rpsPerInstance: 300,
        baseLatencyMs: 30,
        statefulSessions: false,
      }),
      node("db", "database"),
    ],
    edges: [edge("clients", "app"), edge("app", "db")],
    schemaVersion: 1,
  };
}

function result(overrides: Partial<NodeBehaviorResult> = {}): NodeBehaviorResult {
  return {
    outputs: [],
    servedRps: 100,
    droppedRps: 0,
    queueDepth: 0,
    maxQueueDepth: 1_000,
    utilizationRatio: 0.2,
    latencyMs: 10,
    capacityRps: 200,
    ...overrides,
  };
}

describe("failure injection", () => {
  it("activates a kill only inside its window", () => {
    const app = node("app", "appServer");
    const failures = [
      {
        atSec: 5,
        kind: "killNode" as const,
        nodeId: app.id,
        durationSec: 10,
      },
    ];

    expect(failureEffectFor(app.id, [app], failures, 4).killed).toBe(false);
    expect(failureEffectFor(app.id, [app], failures, 6).killed).toBe(true);
    expect(failureEffectFor(app.id, [app], failures, 16).killed).toBe(false);
  });

  it("applies an outage only to nodes in the affected zone", () => {
    const zoned = node("app", "appServer", undefined, "b");
    const failures = [
      {
        atSec: 0,
        kind: "azOutage" as const,
        zone: "b" as const,
        durationSec: 10,
      },
    ];

    expect(failureEffectFor(zoned.id, [zoned], failures, 2).killed).toBe(true);
    expect(failureEffectFor(zoned.id, [zoned], failures, 12).killed).toBe(false);
  });

  it("turns a killed node into dropped traffic", () => {
    const killed = applyFailureEffect(result(), 120, {
      killed: true,
      capacityFactor: 1,
      latencyPenaltyMs: 0,
    });

    expect(killed.servedRps).toBe(0);
    expect(killed.droppedRps).toBe(120);
    expect(killed.outputs).toEqual([]);
  });

  it("degrades throughput and adds latency", () => {
    const slow = applyFailureEffect(result(), 100, {
      killed: false,
      capacityFactor: 0.5,
      latencyPenaltyMs: 180,
    });

    expect(slow.servedRps).toBe(50);
    expect(slow.droppedRps).toBe(50);
    expect(slow.latencyMs).toBe(190);
  });

  it("fails a run when an injected kill removes capacity", () => {
    const app = asNodeId("app");
    const run = runSimulation(architecture(), {
      requirements,
      loadProfile: [{ durationSec: 30, fromUsers: 100, toUsers: 100 }],
      failureScenarios: [{ atSec: 3, kind: "killNode", nodeId: app, durationSec: 12 }],
    });

    expect(run.ok).toBe(true);

    if (!run.ok) {
      throw new Error("Expected the design to compile");
    }

    expect(run.result.outcome.status).toBe("failed");
    expect(run.result.availabilityRatio).toBeLessThan(1);
  });
});

function cacheContext(
  writeStrategy: "writeAround" | "writeThrough" | "writeBack",
): Parameters<typeof cacheBehavior>[0] {
  const cacheNode = node("cache", "cache", {
    kind: "cache",
    memoryGb: 8,
    ttlSec: 300,
    evictionPolicy: "lru",
    writeStrategy,
  });

  return {
    node: cacheNode,
    incoming: { read: 0, write: 1_000, static: 0 },
    outgoingEdges: [edge("cache", "db")],
    upstreamNodes: [],
    requirements,
    timeSec: 30,
    dtSec: 0.1,
    queueDepth: 0,
  };
}

describe("cache write strategies and replication lag", () => {
  it("forwards every write for write-around and write-through", () => {
    const around = cacheBehavior(cacheContext("writeAround"));
    const through = cacheBehavior(cacheContext("writeThrough"));

    expect(around.outputs[0]?.rate.write).toBeCloseTo(1_000);
    expect(through.outputs[0]?.rate.write).toBeCloseTo(1_000);
  });

  it("flushes only a fraction of writes for write-back", () => {
    const writeBack = cacheBehavior(cacheContext("writeBack"));

    expect(writeBack.outputs[0]?.rate.write).toBeCloseTo(100);
  });

  it("adds replication lag only for async replicas under writes", () => {
    const asyncParams = {
      kind: "database" as const,
      instanceSize: "medium" as const,
      readReplicas: 2,
      shards: 1,
      replication: "async" as const,
    };
    const syncParams = { ...asyncParams, replication: "sync" as const };

    expect(databaseReplicationLagMs(asyncParams, 0)).toBe(0);
    expect(databaseReplicationLagMs(asyncParams, 1_000)).toBeGreaterThan(120);
    expect(databaseReplicationLagMs(syncParams, 1_000)).toBe(0);
  });
});
