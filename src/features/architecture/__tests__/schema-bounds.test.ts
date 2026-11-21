import { describe, expect, it } from "vitest";

import {
  MAX_ARCHITECTURE_NODES,
  MAX_POSITION_ABS,
  architectureSchema,
  componentParamsSchema,
} from "../model/schema";
import { defaultComponentParams } from "../model/catalog";
import { asNodeId } from "../model/ids";

function node(index: number) {
  return {
    id: asNodeId(`node_${index}`),
    label: `Node ${index}`,
    position: { x: index, y: 0 },
    region: "us-east" as const,
    zone: "a" as const,
    params: defaultComponentParams("appServer"),
  };
}

describe("architecture schema bounds", () => {
  it("rejects designs with too many nodes", () => {
    const nodes = Array.from({ length: MAX_ARCHITECTURE_NODES + 1 }, (_, index) => node(index));
    const result = architectureSchema.safeParse({ nodes, edges: [], schemaVersion: 1 });

    expect(result.success).toBe(false);
  });

  it("rejects absurd component parameters", () => {
    const result = componentParamsSchema.safeParse({
      kind: "appServer",
      instances: 100_000,
      rpsPerInstance: 300,
      baseLatencyMs: 30,
      statefulSessions: false,
    });

    expect(result.success).toBe(false);
  });

  it("rejects positions outside the canvas bound", () => {
    const result = architectureSchema.safeParse({
      nodes: [{ ...node(0), position: { x: MAX_POSITION_ABS + 1, y: 0 } }],
      edges: [],
      schemaVersion: 1,
    });

    expect(result.success).toBe(false);
  });
});
