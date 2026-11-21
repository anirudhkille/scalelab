import { describe, expect, it } from "vitest";

import { asEdgeId, asNodeId, type ArchEdge } from "@/features/architecture";
import { distributeTraffic, processQueue, usersAtTime } from "@/features/simulation";

function edge(id: string, weight?: number, carries?: ArchEdge["carries"]): ArchEdge {
  return {
    id: asEdgeId(id),
    source: asNodeId("source"),
    target: asNodeId(id),
    ...(weight === undefined ? {} : { weight }),
    ...(carries === undefined ? {} : { carries }),
  };
}

describe("processQueue", () => {
  it("serves all traffic below capacity", () => {
    const result = processQueue({
      incomingRps: 50,
      capacityRps: 100,
      queueDepth: 0,
      maxQueueDepth: 200,
      baseLatencyMs: 30,
      dtSec: 0.1,
    });

    expect(result.servedRps).toBeCloseTo(50);
    expect(result.droppedRps).toBe(0);
    expect(result.queueDepth).toBe(0);
    expect(result.utilizationRatio).toBeCloseTo(0.5);
    expect(result.latencyMs).toBeCloseTo(30);
  });

  it("caps service at capacity and fills the queue", () => {
    const result = processQueue({
      incomingRps: 100,
      capacityRps: 100,
      queueDepth: 0,
      maxQueueDepth: 200,
      baseLatencyMs: 30,
      dtSec: 0.1,
    });

    expect(result.servedRps).toBeCloseTo(100);
    expect(result.droppedRps).toBe(0);
    expect(result.queueDepth).toBe(0);
    expect(result.utilizationRatio).toBeCloseTo(1);
  });

  it("drops work beyond the queue limit and includes queue wait in latency", () => {
    const result = processQueue({
      incomingRps: 200,
      capacityRps: 100,
      queueDepth: 0,
      maxQueueDepth: 5,
      baseLatencyMs: 30,
      dtSec: 0.1,
    });

    expect(result.servedRps).toBeCloseTo(100);
    expect(result.droppedRps).toBeCloseTo(50);
    expect(result.queueDepth).toBeCloseTo(5);
    expect(result.latencyMs).toBeCloseTo(80);
  });

  it("reports full utilization when capacity is zero and traffic exists", () => {
    const result = processQueue({
      incomingRps: 10,
      capacityRps: 0,
      queueDepth: 0,
      maxQueueDepth: 0,
      baseLatencyMs: 10,
      dtSec: 0.1,
    });

    expect(result.servedRps).toBe(0);
    expect(result.droppedRps).toBeCloseTo(10);
    expect(result.utilizationRatio).toBe(1);
  });
});

describe("usersAtTime", () => {
  const profile = [
    { durationSec: 10, fromUsers: 0, toUsers: 100 },
    { durationSec: 10, fromUsers: 100, toUsers: 200 },
  ];

  it("interpolates ramps", () => {
    expect(usersAtTime(profile, 0)).toBe(0);
    expect(usersAtTime(profile, 5)).toBeCloseTo(50);
    expect(usersAtTime(profile, 10)).toBeCloseTo(100);
    expect(usersAtTime(profile, 15)).toBeCloseTo(150);
  });

  it("holds the final value after the last stage", () => {
    expect(usersAtTime(profile, 25)).toBe(200);
    expect(usersAtTime(profile, 1_000)).toBe(200);
  });

  it("returns zero for an empty profile", () => {
    expect(usersAtTime([], 10)).toBe(0);
  });
});

describe("distributeTraffic", () => {
  const rate = { read: 60, write: 30, static: 30 };

  it("splits traffic evenly across three backends", () => {
    const result = distributeTraffic(rate, [edge("a"), edge("b"), edge("c")]);

    expect(result.flows).toHaveLength(3);
    for (const flow of result.flows) {
      expect(flow.rate.read).toBeCloseTo(20);
      expect(flow.rate.write).toBeCloseTo(10);
      expect(flow.rate.static).toBeCloseTo(10);
    }
    expect(result.unrouted).toEqual({ read: 0, write: 0, static: 0 });
  });

  it("honors edge weights", () => {
    const result = distributeTraffic(rate, [edge("a", 3), edge("b", 1)]);
    const byId = new Map(result.flows.map((flow) => [flow.edgeId, flow.rate]));

    expect(byId.get(asEdgeId("a"))?.read).toBeCloseTo(45);
    expect(byId.get(asEdgeId("b"))?.read).toBeCloseTo(15);
  });

  it("routes each class only to edges that carry it", () => {
    const result = distributeTraffic(rate, [
      edge("reads", undefined, ["read"]),
      edge("writes", undefined, ["write"]),
      edge("static", undefined, ["static"]),
    ]);
    const byId = new Map(result.flows.map((flow) => [flow.edgeId, flow.rate]));

    expect(byId.get(asEdgeId("reads"))).toEqual({ read: 60, write: 0, static: 0 });
    expect(byId.get(asEdgeId("writes"))).toEqual({ read: 0, write: 30, static: 0 });
    expect(byId.get(asEdgeId("static"))).toEqual({ read: 0, write: 0, static: 30 });
    expect(result.unrouted).toEqual({ read: 0, write: 0, static: 0 });
  });

  it("reports traffic with no eligible edge as unrouted", () => {
    const result = distributeTraffic(rate, [edge("reads", undefined, ["read"])]);

    expect(result.unrouted.read).toBe(0);
    expect(result.unrouted.write).toBeCloseTo(30);
    expect(result.unrouted.static).toBeCloseTo(30);
  });
});
