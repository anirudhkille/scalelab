import { z } from "zod";

import {
  DATABASE_INSTANCE_SIZES,
  EVICTION_POLICIES,
  LOAD_BALANCER_ALGORITHMS,
  NODE_KINDS,
  REPLICATION_MODES,
  type EdgeId,
  type NodeId,
} from "./types";

export const ratioSchema = z.number().min(0).max(1);

export const nodeIdSchema = z.custom<NodeId>(
  (value) => typeof value === "string" && value.length > 0,
  { message: "NodeId must be a non-empty string" },
);

export const edgeIdSchema = z.custom<EdgeId>(
  (value) => typeof value === "string" && value.length > 0,
  { message: "EdgeId must be a non-empty string" },
);

export const vec2Schema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
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
    capacityRps: z.number().positive(),
  }),
  z.object({
    kind: z.literal("apiGateway"),
    limitRps: z.number().positive(),
  }),
  z.object({
    kind: z.literal("rateLimiter"),
    limitRps: z.number().positive(),
  }),
  z.object({
    kind: z.literal("appServer"),
    instances: z.number().int().positive(),
    rpsPerInstance: z.number().positive(),
    baseLatencyMs: z.number().nonnegative(),
    statefulSessions: z.boolean(),
  }),
  z.object({
    kind: z.literal("cache"),
    memoryGb: z.number().positive(),
    ttlSec: z.number().positive(),
    evictionPolicy: z.enum(EVICTION_POLICIES),
  }),
  z.object({
    kind: z.literal("database"),
    instanceSize: z.enum(DATABASE_INSTANCE_SIZES),
    readReplicas: z.number().int().nonnegative(),
    shards: z.number().int().positive(),
    replication: z.enum(REPLICATION_MODES),
  }),
  z.object({
    kind: z.literal("queue"),
    maxDepth: z.number().int().positive(),
    throughputRps: z.number().positive(),
  }),
  z.object({
    kind: z.literal("worker"),
    instances: z.number().int().positive(),
    rpsPerInstance: z.number().positive(),
  }),
  z.object({ kind: z.literal("objectStorage") }),
]);

export const archNodeSchema = z.object({
  id: nodeIdSchema,
  label: z.string().min(1),
  position: vec2Schema,
  params: componentParamsSchema,
});

export const archEdgeSchema = z.object({
  id: edgeIdSchema,
  source: nodeIdSchema,
  target: nodeIdSchema,
  weight: z.number().positive().optional(),
  carries: z
    .array(z.enum(["read", "write", "static"]))
    .readonly()
    .optional(),
});

export const architectureSchema = z.object({
  nodes: z.array(archNodeSchema).readonly(),
  edges: z.array(archEdgeSchema).readonly(),
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
