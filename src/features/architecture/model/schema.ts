import { z } from "zod";

import {
  CACHE_WRITE_STRATEGIES,
  DATABASE_INSTANCE_SIZES,
  EVICTION_POLICIES,
  LOAD_BALANCER_ALGORITHMS,
  NODE_KINDS,
  REGION_IDS,
  REPLICATION_MODES,
  ZONE_IDS,
  type EdgeId,
  type NodeId,
} from "./types";

export const MAX_ARCHITECTURE_NODES = 200;
export const MAX_ARCHITECTURE_EDGES = 600;
export const MAX_NODE_LABEL_LENGTH = 120;
export const MAX_POSITION_ABS = 100_000;

export const ratioSchema = z.number().min(0).max(1);

export const nodeIdSchema = z.custom<NodeId>(
  (value) => typeof value === "string" && value.length > 0 && value.length <= 200,
  { message: "NodeId must be a non-empty string of at most 200 characters" },
);

export const edgeIdSchema = z.custom<EdgeId>(
  (value) => typeof value === "string" && value.length > 0 && value.length <= 200,
  { message: "EdgeId must be a non-empty string of at most 200 characters" },
);

export const vec2Schema = z.object({
  x: z.number().finite().min(-MAX_POSITION_ABS).max(MAX_POSITION_ABS),
  y: z.number().finite().min(-MAX_POSITION_ABS).max(MAX_POSITION_ABS),
});

export const componentParamsSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("clients") }),
  z.object({ kind: z.literal("dns") }),
  z.object({
    kind: z.literal("cdn"),
    hitRatio: ratioSchema,
  }),
  z.object({
    kind: z.literal("loadBalancer"),
    algorithm: z.enum(LOAD_BALANCER_ALGORITHMS),
    capacityRps: z.number().positive().max(1_000_000),
  }),
  z.object({
    kind: z.literal("apiGateway"),
    limitRps: z.number().positive().max(1_000_000),
  }),
  z.object({
    kind: z.literal("rateLimiter"),
    limitRps: z.number().positive().max(1_000_000),
  }),
  z.object({
    kind: z.literal("appServer"),
    instances: z.number().int().positive().max(200),
    rpsPerInstance: z.number().positive().max(100_000),
    baseLatencyMs: z.number().nonnegative().max(60_000),
    statefulSessions: z.boolean(),
  }),
  z.object({
    kind: z.literal("cache"),
    memoryGb: z.number().positive().max(4_096),
    ttlSec: z.number().positive().max(604_800),
    evictionPolicy: z.enum(EVICTION_POLICIES),
    writeStrategy: z.enum(CACHE_WRITE_STRATEGIES).default("writeAround"),
  }),
  z.object({
    kind: z.literal("database"),
    instanceSize: z.enum(DATABASE_INSTANCE_SIZES),
    readReplicas: z.number().int().nonnegative().max(20),
    shards: z.number().int().positive().max(64),
    replication: z.enum(REPLICATION_MODES),
  }),
  z.object({
    kind: z.literal("searchIndex"),
    shards: z.number().int().positive().max(64),
    rpsPerShard: z.number().positive().max(100_000),
    indexingWriteCostRatio: ratioSchema,
  }),
  z.object({
    kind: z.literal("queue"),
    maxDepth: z.number().int().positive().max(10_000_000),
    throughputRps: z.number().positive().max(1_000_000),
  }),
  z.object({
    kind: z.literal("worker"),
    instances: z.number().int().positive().max(200),
    rpsPerInstance: z.number().positive().max(100_000),
  }),
  z.object({ kind: z.literal("objectStorage") }),
]);

export const archNodeSchema = z.object({
  id: nodeIdSchema,
  label: z.string().min(1).max(MAX_NODE_LABEL_LENGTH),
  position: vec2Schema,
  region: z.enum(REGION_IDS).default("us-east"),
  zone: z.enum(ZONE_IDS).default("a"),
  params: componentParamsSchema,
});

export const archEdgeSchema = z.object({
  id: edgeIdSchema,
  source: nodeIdSchema,
  target: nodeIdSchema,
  weight: z.number().positive().max(1_000).optional(),
  carries: z
    .array(z.enum(["read", "write", "static"]))
    .readonly()
    .optional(),
});

export const architectureSchema = z.object({
  nodes: z.array(archNodeSchema).max(MAX_ARCHITECTURE_NODES).readonly(),
  edges: z.array(archEdgeSchema).max(MAX_ARCHITECTURE_EDGES).readonly(),
  schemaVersion: z.number().int().nonnegative(),
});

export type ComponentParams = z.infer<typeof componentParamsSchema>;
export type ArchNode = z.infer<typeof archNodeSchema>;
export type ArchEdge = z.infer<typeof archEdgeSchema>;
export type Architecture = z.infer<typeof architectureSchema>;

/** Compile-time guard that every NodeKind has exactly one params variant. */
export type ComponentParamsByKind = {
  [Kind in (typeof NODE_KINDS)[number]]: Extract<ComponentParams, { kind: Kind }>;
};
