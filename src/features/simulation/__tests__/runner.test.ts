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
    label: kind,
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

const requirements = {
  targetUsers: 300,
  requestsPerUserPerSec: 1,
  readRatio: 0.5,
  staticRatio: 0,
  workingSetGb: 1,
  dataSizeGb: 1,
  latencyP95Ms: 1_000,
  maxErrorRatio: 0.01,
  monthlyBudgetUsd: 2_000,
} as const;

const config: SimulationConfig = {
  requirements,
  loadProfile: [{ durationSec: 60, fromUsers: 300, toUsers: 300 }],
};

function appServer(instances: number): ArchNode {
  return node("app", "appServer", {
    kind: "appServer",
    instances,
    rpsPerInstance: 100,
    baseLatencyMs: 30,
    statefulSessions: false,
  });
}

describe("runSimulation", () => {
  it("fails a single server that cannot absorb the target load", () => {
    const result = runSimulation(
      architecture(
        [node("clients", "clients"), node("lb", "loadBalancer"), appServer(1)],
        [edge("clients", "lb"), edge("lb", "app")],
      ),
      config,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.result.outcome.status).toBe("failed");
    if (result.result.outcome.status !== "failed") {
      return;
    }

    expect(result.result.outcome.reason.type).toBe("queueOverflow");
    expect(result.result.outcome.rootCauseNodeId).toBe("app");
  });

  it("passes when three servers split the target load", () => {
    const result = runSimulation(
      architecture(
        [
          node("clients", "clients"),
          node("lb", "loadBalancer"),
          appServer(1),
          node("app-2", "appServer", {
            kind: "appServer",
            instances: 1,
            rpsPerInstance: 100,
            baseLatencyMs: 30,
            statefulSessions: false,
          }),
          node("app-3", "appServer", {
            kind: "appServer",
            instances: 1,
            rpsPerInstance: 100,
            baseLatencyMs: 30,
            statefulSessions: false,
          }),
        ],
        [edge("clients", "lb"), edge("lb", "app"), edge("lb", "app-2"), edge("lb", "app-3")],
      ),
      config,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.result.outcome.status).toBe("passed");
    expect(result.result.maxUsersSustained).toBe(300);
    expect(result.result.finalStep.nodes.filter((snapshot) => snapshot.servedRps > 0)).toHaveLength(
      5,
    );
  });

  it("tracks max users sustained during a ramp", () => {
    const result = runSimulation(
      architecture([node("clients", "clients"), appServer(4)], [edge("clients", "app")]),
      {
        requirements: { ...requirements, targetUsers: 200 },
        loadProfile: [
          { durationSec: 10, fromUsers: 0, toUsers: 200 },
          { durationSec: 20, fromUsers: 200, toUsers: 200 },
        ],
      },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.result.outcome.status).toBe("passed");
    expect(result.result.maxUsersSustained).toBeGreaterThanOrEqual(200);
  });

  it("returns graph issues instead of running an invalid architecture", () => {
    const result = runSimulation(architecture([node("app", "appServer")], []), config);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.issues.map((issue) => issue.code)).toContain("no-clients");
  });

  it("is deterministic", () => {
    const design = architecture(
      [node("clients", "clients"), node("lb", "loadBalancer"), appServer(1)],
      [edge("clients", "lb"), edge("lb", "app")],
    );

    const first = runSimulation(design, config);
    const second = runSimulation(design, config);

    expect(first).toEqual(second);
  });
});
