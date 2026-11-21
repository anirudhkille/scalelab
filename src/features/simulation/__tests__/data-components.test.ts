import { describe, expect, it } from "vitest";

import {
  asEdgeId,
  asNodeId,
  defaultComponentParams,
  type ArchEdge,
  type ArchNode,
  type ComponentParamsByKind,
  type NodeKind,
} from "@/features/architecture";
import type { ChallengeRequirements } from "@/features/challenges";
import type { NodeBehaviorContext } from "@/features/simulation";
import {
  cacheHitRatioAtTime,
  cacheSteadyHitRatio,
  CACHE_WARMUP_SEC,
  databaseCapacities,
  databaseStorageExceeded,
  processDatabaseTick,
} from "@/features/simulation";

import { cacheBehavior } from "../engine/nodes/cache";
import { cdnBehavior } from "../engine/nodes/cdn";
import { messageQueueBehavior } from "../engine/nodes/message-queue";
import { workerBehavior } from "../engine/nodes/worker";

const requirements: ChallengeRequirements = {
  targetUsers: 10_000,
  requestsPerUserPerSec: 1,
  readRatio: 0.8,
  staticRatio: 0,
  workingSetGb: 100,
  dataSizeGb: 50,
  latencyP95Ms: 500,
  maxErrorRatio: 0.01,
  monthlyBudgetUsd: 5_000,
};

function node<T extends NodeKind>(
  id: string,
  kind: T,
  params: ComponentParamsByKind[T] = defaultComponentParams(kind) as ComponentParamsByKind[T],
): ArchNode {
  return {
    id: asNodeId(id),
    label: kind,
    position: { x: 0, y: 0 },
    region: "us-east",
    zone: "a",
    params,
  };
}

function edge(id: string, carries?: ArchEdge["carries"]): ArchEdge {
  return {
    id: asEdgeId(id),
    source: asNodeId("source"),
    target: asNodeId(id),
    ...(carries === undefined ? {} : { carries }),
  };
}

function context(
  nodeValue: ArchNode,
  incoming: NodeBehaviorContext["incoming"],
  overrides: Partial<NodeBehaviorContext> = {},
): NodeBehaviorContext {
  return {
    node: nodeValue,
    incoming,
    outgoingEdges: [edge("out")],
    upstreamNodes: [],
    requirements,
    timeSec: CACHE_WARMUP_SEC,
    dtSec: 0.1,
    queueDepth: 0,
    ...overrides,
  };
}

describe("cache hit ratio", () => {
  it("follows the documented diminishing-returns formula", () => {
    const steady = cacheSteadyHitRatio(8, 100);
    const expected = Math.pow(0.08, 0.6) * 0.98;

    expect(steady).toBeCloseTo(expected);
    expect(steady).toBeGreaterThan(0);
    expect(steady).toBeLessThan(0.25);
  });

  it("reaches the ceiling when memory covers the working set", () => {
    expect(cacheSteadyHitRatio(256, 10)).toBeCloseTo(0.98);
  });

  it("ramps from zero to steady state over the warm-up window", () => {
    const steady = cacheSteadyHitRatio(8, 100);

    expect(cacheHitRatioAtTime(8, 100, 0)).toBe(0);
    expect(cacheHitRatioAtTime(8, 100, CACHE_WARMUP_SEC / 2)).toBeCloseTo(steady / 2);
    expect(cacheHitRatioAtTime(8, 100, CACHE_WARMUP_SEC)).toBeCloseTo(steady);
    expect(cacheHitRatioAtTime(8, 100, 10_000)).toBeCloseTo(steady);
  });
});

describe("cache behavior", () => {
  it("serves hits and forwards misses without touching writes or static", () => {
    const cache = node("cache", "cache", {
      kind: "cache",
      memoryGb: 8,
      ttlSec: 300,
      evictionPolicy: "lru",
      writeStrategy: "writeAround",
    });
    const result = cacheBehavior(context(cache, { read: 1_000, write: 100, static: 50 }));
    const steadyHitRatio = cacheSteadyHitRatio(8, requirements.workingSetGb);

    expect(result.hitRatio).toBeCloseTo(steadyHitRatio);
    expect(result.servedRps).toBeCloseTo(1_150);
    expect(result.droppedRps).toBe(0);
    expect(result.outputs[0]?.rate.read).toBeCloseTo(1_000 * (1 - steadyHitRatio));
    expect(result.outputs[0]?.rate.write).toBeCloseTo(100);
    expect(result.outputs[0]?.rate.static).toBeCloseTo(50);
  });

  it("forwards every read during a cold start", () => {
    const cache = node("cache", "cache", {
      kind: "cache",
      memoryGb: 8,
      ttlSec: 300,
      evictionPolicy: "lru",
      writeStrategy: "writeAround",
    });
    const result = cacheBehavior(
      context(cache, { read: 1_000, write: 0, static: 0 }, { timeSec: 0 }),
    );

    expect(result.hitRatio).toBe(0);
    expect(result.outputs[0]?.rate.read).toBeCloseTo(1_000);
  });
});

describe("CDN behavior", () => {
  it("absorbs static hits and forwards static misses plus dynamic traffic", () => {
    const cdn = node("cdn", "cdn", { kind: "cdn", hitRatio: 0.9 });
    const result = cdnBehavior(context(cdn, { read: 200, write: 100, static: 1_000 }));

    expect(result.hitRatio).toBe(0.9);
    expect(result.servedRps).toBeCloseTo(1_300);
    expect(result.outputs[0]?.rate.read).toBeCloseTo(200);
    expect(result.outputs[0]?.rate.write).toBeCloseTo(100);
    expect(result.outputs[0]?.rate.static).toBeCloseTo(100);
  });
});

describe("database capacities", () => {
  const small = {
    kind: "database",
    instanceSize: "small",
    readReplicas: 0,
    shards: 1,
    replication: "async",
  } as const;

  it("adds read replicas to read capacity but not write capacity", () => {
    const single = databaseCapacities(small);
    const replicated = databaseCapacities({ ...small, readReplicas: 3 });

    expect(replicated.readRps).toBeCloseTo(single.readRps * 4);
    expect(replicated.writeRps).toBeCloseTo(single.writeRps);
  });

  it("makes sync replication cost write capacity", () => {
    const async = databaseCapacities(small);
    const sync = databaseCapacities({ ...small, replication: "sync" });

    expect(sync.writeRps).toBeCloseTo(async.writeRps * 0.7);
    expect(sync.readRps).toBeCloseTo(async.readRps);
  });

  it("makes sharding sublinear because one shard is hottest", () => {
    const single = databaseCapacities(small);
    const fourShards = databaseCapacities({ ...small, shards: 4 });

    expect(fourShards.readRps).toBeGreaterThan(single.readRps * 3);
    expect(fourShards.readRps).toBeLessThan(single.readRps * 4);
    expect(fourShards.writeRps).toBeLessThan(single.writeRps * 4);
  });

  it("combines read and write utilization into one shared queue", () => {
    const readOnly = processDatabaseTick({
      params: small,
      incoming: { read: 1_000, write: 0, static: 0 },
      queueDepth: 0,
      dtSec: 0.1,
    });
    const writeOnly = processDatabaseTick({
      params: small,
      incoming: { read: 0, write: 250, static: 0 },
      queueDepth: 0,
      dtSec: 0.1,
    });
    const mixed = processDatabaseTick({
      params: small,
      incoming: { read: 1_000, write: 250, static: 0 },
      queueDepth: 0,
      dtSec: 0.1,
    });

    expect(readOnly.utilizationRatio).toBeCloseTo(0.5);
    expect(writeOnly.utilizationRatio).toBeCloseTo(0.5);
    expect(mixed.utilizationRatio).toBeCloseTo(1);
  });

  it("reports storage exhaustion from data size and shard count", () => {
    expect(databaseStorageExceeded(small, 100)).toBe(false);
    expect(databaseStorageExceeded(small, 101)).toBe(true);
    expect(databaseStorageExceeded({ ...small, shards: 2 }, 201)).toBe(true);
  });
});

describe("queue and worker behavior", () => {
  it("absorbs writes faster than the drain rate", () => {
    const queue = node("queue", "queue", {
      kind: "queue",
      maxDepth: 10_000,
      throughputRps: 500,
    });
    const result = messageQueueBehavior(context(queue, { read: 0, write: 1_000, static: 0 }));

    expect(result.servedRps).toBeCloseTo(1_000);
    expect(result.droppedRps).toBe(0);
    expect(result.queueDepth).toBeCloseTo(50);
    expect(result.outputs[0]?.rate.write).toBeCloseTo(500);
  });

  it("grows queue depth while workers are slower than the queue drain", () => {
    const queue = node("queue", "queue", {
      kind: "queue",
      maxDepth: 10_000,
      throughputRps: 2_000,
    });
    const worker = node("worker", "worker", {
      kind: "worker",
      instances: 2,
      rpsPerInstance: 200,
    });
    const queueResult = messageQueueBehavior(context(queue, { read: 0, write: 1_000, static: 0 }));
    const workerResult = workerBehavior(
      context(worker, { read: 0, write: queueResult.outputs[0]?.rate.write ?? 0, static: 0 }),
    );

    expect(workerResult.queueDepth).toBeCloseTo(60);
    expect(workerResult.outputs[0]?.rate.write).toBeCloseTo(400);
  });

  it("drops writes beyond the configured queue depth", () => {
    const queue = node("queue", "queue", {
      kind: "queue",
      maxDepth: 5,
      throughputRps: 100,
    });
    const result = messageQueueBehavior(context(queue, { read: 0, write: 200, static: 0 }));

    expect(result.queueDepth).toBe(5);
    expect(result.droppedRps).toBeCloseTo(50);
  });

  it("passes reads and static traffic without queueing them", () => {
    const queue = node("queue", "queue", {
      kind: "queue",
      maxDepth: 1_000,
      throughputRps: 100,
    });
    const result = messageQueueBehavior(context(queue, { read: 100, write: 0, static: 50 }));

    expect(result.queueDepth).toBe(0);
    expect(result.outputs[0]?.rate.read).toBeCloseTo(100);
    expect(result.outputs[0]?.rate.static).toBeCloseTo(50);
  });
});
