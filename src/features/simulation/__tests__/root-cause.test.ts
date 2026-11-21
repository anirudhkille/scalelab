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
import { runSimulation, type SimulationConfig } from "@/features/simulation";

function node<T extends NodeKind>(
  id: string,
  kind: T,
  params: ComponentParamsByKind[T] = defaultComponentParams(kind) as ComponentParamsByKind[T],
): ArchNode {
  return {
    id: asNodeId(id),
    label: id,
    position: { x: 0, y: 0 },
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

function architecture(nodes: readonly ArchNode[], edges: readonly ArchEdge[]): Architecture {
  return { nodes, edges, schemaVersion: 1 };
}

const baseRequirements = {
  targetUsers: 5_000,
  requestsPerUserPerSec: 1,
  readRatio: 1,
  staticRatio: 0,
  workingSetGb: 1,
  dataSizeGb: 1,
  latencyP95Ms: 1_000,
  maxErrorRatio: 0.01,
  monthlyBudgetUsd: 10_000,
} as const;

function fixedLoadConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    requirements: baseRequirements,
    loadProfile: [{ durationSec: 30, fromUsers: 5_000, toUsers: 5_000 }],
    ...overrides,
  };
}

function appServer(instances: number): ArchNode {
  return node("app", "appServer", {
    kind: "appServer",
    instances,
    rpsPerInstance: 300,
    baseLatencyMs: 30,
    statefulSessions: false,
  });
}

describe("root-cause attribution", () => {
  it("points at a single saturated database", () => {
    const result = runSimulation(
      architecture(
        [node("clients", "clients"), appServer(50), node("db", "database")],
        [edge("clients", "app"), edge("app", "db")],
      ),
      fixedLoadConfig(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok || result.result.outcome.status !== "failed") {
      return;
    }

    expect(result.result.outcome.reason.type).toBe("queueOverflow");
    expect(result.result.outcome.rootCauseNodeId).toBe("db");
  });

  it("attributes a database overflow to an undersized cache", () => {
    const result = runSimulation(
      architecture(
        [
          node("clients", "clients"),
          appServer(50),
          node("cache", "cache", {
            kind: "cache",
            memoryGb: 1,
            ttlSec: 300,
            evictionPolicy: "lru",
          }),
          node("db", "database"),
        ],
        [edge("clients", "app"), edge("app", "cache"), edge("cache", "db")],
      ),
      fixedLoadConfig({
        requirements: { ...baseRequirements, workingSetGb: 100 },
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok || result.result.outcome.status !== "failed") {
      return;
    }

    expect(result.result.outcome.rootCauseNodeId).toBe("cache");
  });

  it("points at a saturated load balancer", () => {
    const result = runSimulation(
      architecture(
        [
          node("clients", "clients"),
          node("lb", "loadBalancer", {
            kind: "loadBalancer",
            algorithm: "roundRobin",
            capacityRps: 100,
          }),
          appServer(50),
        ],
        [edge("clients", "lb"), edge("lb", "app")],
      ),
      fixedLoadConfig({
        requirements: { ...baseRequirements, targetUsers: 1_000 },
        loadProfile: [{ durationSec: 30, fromUsers: 1_000, toUsers: 1_000 }],
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok || result.result.outcome.status !== "failed") {
      return;
    }

    expect(result.result.outcome.rootCauseNodeId).toBe("lb");
  });

  it("fails a database whose shards cannot hold the challenge data", () => {
    const result = runSimulation(
      architecture([node("clients", "clients"), node("db", "database")], [edge("clients", "db")]),
      fixedLoadConfig({
        requirements: {
          ...baseRequirements,
          targetUsers: 10,
          dataSizeGb: 101,
        },
        loadProfile: [{ durationSec: 30, fromUsers: 10, toUsers: 10 }],
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok || result.result.outcome.status !== "failed") {
      return;
    }

    expect(result.result.outcome.reason.type).toBe("storageExhausted");
    expect(result.result.outcome.rootCauseNodeId).toBe("db");
  });
});
