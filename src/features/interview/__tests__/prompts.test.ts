import { describe, expect, it } from "vitest";

import {
  asNodeId,
  defaultComponentParams,
  type Architecture,
  type ComponentParams,
  type RegionId,
} from "@/features/architecture";

import { buildTradeoffPrompts } from "../prompts";

function node(id: string, params: ComponentParams, region: RegionId = "us-east") {
  return {
    id: asNodeId(id),
    label: id,
    position: { x: 0, y: 0 },
    region,
    zone: "a" as const,
    params,
  };
}

function architecture(nodes: readonly ReturnType<typeof node>[]): Architecture {
  return { schemaVersion: 1, nodes, edges: [] };
}

describe("interview prompts", () => {
  it("always asks for capacity, the bottleneck, and a failure mode", () => {
    const prompts = buildTradeoffPrompts(architecture([]));
    const ids = prompts.map((prompt) => prompt.id);

    expect(ids).toEqual(["capacity", "bottleneck", "failure-mode"]);
  });

  it("adapts questions to the components in the design", () => {
    const database: ComponentParams = {
      kind: "database",
      instanceSize: "medium",
      readReplicas: 2,
      shards: 3,
      replication: "async",
    };
    const prompts = buildTradeoffPrompts(
      architecture([
        node("db", database),
        node("cache", defaultComponentParams("cache")),
        node("queue", defaultComponentParams("queue")),
        node("limiter", defaultComponentParams("rateLimiter")),
      ]),
    );
    const ids = prompts.map((prompt) => prompt.id);

    expect(ids).toContain("cache");
    expect(ids).toContain("queue");
    expect(ids).toContain("replication");
    expect(ids).toContain("sharding");
    expect(ids).not.toContain("rate-limit");
    expect(prompts).toHaveLength(7);
  });

  it("flags multi-region designs", () => {
    const prompts = buildTradeoffPrompts(
      architecture([
        node("app-us", defaultComponentParams("appServer")),
        node("app-eu", defaultComponentParams("appServer"), "eu-west"),
      ]),
    );

    expect(prompts.map((prompt) => prompt.id)).toContain("multi-region");
  });
});
