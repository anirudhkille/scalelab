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
  DIAGNOSIS_RULES,
  DIAGNOSIS_RULE_IDS,
  diagnoseFailure,
  trafficMixFor,
} from "@/features/diagnosis";
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
    region: "us-east",
    zone: "a",
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

const requirements: ChallengeRequirements = {
  targetUsers: 5_000,
  requestsPerUserPerSec: 1,
  readRatio: 0.9,
  staticRatio: 0,
  workingSetGb: 100,
  dataSizeGb: 1,
  latencyP95Ms: 1_000,
  maxErrorRatio: 0.01,
  monthlyBudgetUsd: 10_000,
};

const config: SimulationConfig = {
  requirements,
  loadProfile: [{ durationSec: 30, fromUsers: 5_000, toUsers: 5_000 }],
};

function appServer(instances: number): ArchNode {
  return node("app", "appServer", {
    kind: "appServer",
    instances,
    rpsPerInstance: 300,
    baseLatencyMs: 30,
    statefulSessions: false,
  });
}

describe("diagnosis rule catalog", () => {
  it("ships at least the 15 required templates", () => {
    expect(DIAGNOSIS_RULES.length).toBeGreaterThanOrEqual(15);
    expect(DIAGNOSIS_RULES.map((rule) => rule.id)).toEqual([...DIAGNOSIS_RULE_IDS]);
  });

  it("gives every rule an explanation and a nudge", () => {
    for (const rule of DIAGNOSIS_RULES) {
      expect(rule.headline.length).toBeGreaterThan(0);
      expect(rule.whyItMatters.length).toBeGreaterThan(0);
      expect(rule.nudge.length).toBeGreaterThan(0);
      expect(rule.failureTypes.length).toBeGreaterThan(0);
      expect(rule.trafficMix.length).toBeGreaterThan(0);
    }
  });

  it("classifies challenge traffic mix", () => {
    expect(trafficMixFor({ ...requirements, readRatio: 0.9, staticRatio: 0 })).toBe("readHeavy");
    expect(trafficMixFor({ ...requirements, readRatio: 0.2, staticRatio: 0.2 })).toBe("writeHeavy");
    expect(trafficMixFor({ ...requirements, readRatio: 0.2, staticRatio: 0.6 })).toBe(
      "staticHeavy",
    );
    expect(trafficMixFor({ ...requirements, readRatio: 0.4, staticRatio: 0.2 })).toBe("balanced");
  });
});

describe("diagnoseFailure", () => {
  it("returns null for a passing run", () => {
    const result = runSimulation(
      architecture([node("clients", "clients"), appServer(50)], [edge("clients", "app")]),
      {
        requirements: { ...requirements, targetUsers: 10, readRatio: 0.5 },
        loadProfile: [{ durationSec: 30, fromUsers: 10, toUsers: 10 }],
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(diagnoseFailure(architecture([], []), requirements, result.result)).toBeNull();
  });

  it("explains a read-bound database", () => {
    const design = architecture(
      [node("clients", "clients"), appServer(50), node("db", "database")],
      [edge("clients", "app"), edge("app", "db")],
    );
    const result = runSimulation(design, config);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const diagnosis = diagnoseFailure(design, requirements, result.result);
    expect(diagnosis?.ruleId).toBe("db-read-bound");
    expect(diagnosis?.primaryBottleneckNodeId).toBe("db");
    expect(diagnosis?.evidence.p95LatencyMs).toBeGreaterThan(0);
  });

  it("explains an undersized cache instead of blaming only the database", () => {
    const design = architecture(
      [
        node("clients", "clients"),
        appServer(50),
        node("cache", "cache", {
          kind: "cache",
          memoryGb: 1,
          ttlSec: 300,
          evictionPolicy: "lru",
          writeStrategy: "writeAround",
        }),
        node("db", "database"),
      ],
      [edge("clients", "app"), edge("app", "cache"), edge("cache", "db")],
    );
    const result = runSimulation(design, config);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const diagnosis = diagnoseFailure(design, requirements, result.result);
    expect(diagnosis?.ruleId).toBe("cache-too-small");
    expect(diagnosis?.primaryBottleneckNodeId).toBe("cache");
    expect(diagnosis?.nudge.length).toBeGreaterThan(0);
  });
});
