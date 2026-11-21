import { describe, expect, it } from "vitest";

import {
  asEdgeId,
  asNodeId,
  compileArchitectureGraph,
  defaultComponentParams,
  type ArchEdge,
  type ArchNode,
  type Architecture,
  type ComponentParamsByKind,
  type NodeKind,
} from "@/features/architecture";

function node(id: string, kind: NodeKind): ArchNode {
  return {
    id: asNodeId(id),
    label: kind,
    position: { x: 0, y: 0 },
    params: defaultComponentParams(kind),
  };
}

function withParams<T extends NodeKind>(
  id: string,
  kind: T,
  params: ComponentParamsByKind[T],
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

describe("compileArchitectureGraph", () => {
  it("accepts a simple clients -> app server graph and builds a topological order", () => {
    const result = compileArchitectureGraph(
      architecture(
        [node("clients", "clients"), node("app", "appServer")],
        [edge("clients", "app")],
      ),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.graph.clientId).toBe("clients");
    expect(result.graph.order).toEqual(["clients", "app"]);
    expect(result.graph.incomingById.get(asNodeId("app"))).toHaveLength(1);
  });

  it("rejects a graph with no clients node", () => {
    const result = compileArchitectureGraph(architecture([node("app", "appServer")], []));

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.issues.map((issue) => issue.code)).toContain("no-clients");
  });

  it("rejects multiple clients nodes", () => {
    const result = compileArchitectureGraph(
      architecture([node("a", "clients"), node("b", "clients")], []),
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.issues.map((issue) => issue.code)).toContain("multiple-clients");
  });

  it("rejects traffic flowing back into clients", () => {
    const result = compileArchitectureGraph(
      architecture(
        [node("clients", "clients"), node("app", "appServer")],
        [edge("clients", "app"), edge("app", "clients")],
      ),
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.issues.map((issue) => issue.code)).toContain("cycle");
    expect(result.issues.map((issue) => issue.code)).toContain("clients-has-incoming");
  });

  it("rejects cycles", () => {
    const result = compileArchitectureGraph(
      architecture(
        [node("clients", "clients"), node("a", "appServer"), node("b", "appServer")],
        [edge("clients", "a"), edge("a", "b"), edge("b", "a")],
      ),
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    const cycle = result.issues.find((issue) => issue.code === "cycle");
    expect(cycle).toMatchObject({
      code: "cycle",
      nodeIds: expect.arrayContaining([asNodeId("a"), asNodeId("b")]),
    });
  });

  it("rejects orphan nodes", () => {
    const result = compileArchitectureGraph(
      architecture(
        [node("clients", "clients"), node("app", "appServer"), node("orphan", "cache")],
        [edge("clients", "app")],
      ),
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.issues).toContainEqual({ code: "unreachable-node", nodeId: asNodeId("orphan") });
  });

  it("rejects duplicate ids, dangling edges and self edges", () => {
    const result = compileArchitectureGraph(
      architecture(
        [node("clients", "clients"), node("app", "appServer"), node("app", "cache")],
        [
          { id: asEdgeId("edge-1"), source: asNodeId("clients"), target: asNodeId("app") },
          { id: asEdgeId("edge-1"), source: asNodeId("app"), target: asNodeId("missing") },
          { id: asEdgeId("edge-2"), source: asNodeId("app"), target: asNodeId("app") },
        ],
      ),
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    const codes = result.issues.map((issue) => issue.code);
    expect(codes).toContain("duplicate-node-id");
    expect(codes).toContain("duplicate-edge-id");
    expect(codes).toContain("dangling-edge");
    expect(codes).toContain("self-edge");
  });

  it("can require a component kind", () => {
    const result = compileArchitectureGraph(
      architecture(
        [node("clients", "clients"), node("app", "appServer")],
        [edge("clients", "app")],
      ),
      { requiredKinds: ["cache"] },
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.issues).toContainEqual({ code: "missing-required-kind", kind: "cache" });
  });

  it("accepts parameterized nodes", () => {
    const result = compileArchitectureGraph(
      architecture(
        [
          node("clients", "clients"),
          withParams("app", "appServer", {
            kind: "appServer",
            instances: 4,
            rpsPerInstance: 250,
            baseLatencyMs: 20,
            statefulSessions: false,
          }),
        ],
        [edge("clients", "app")],
      ),
    );

    expect(result.ok).toBe(true);
  });
});
