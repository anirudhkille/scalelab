/**
 * Primitive architecture vocabulary.
 *
 * Object shapes and schemas live in `schema.ts` so persisted designs have a
 * single Zod source of truth. This file only holds the const tables, branded
 * ids and primitive unions that the schemas build on.
 */

export const NODE_KINDS = [
  "clients",
  "dns",
  "cdn",
  "loadBalancer",
  "apiGateway",
  "rateLimiter",
  "appServer",
  "cache",
  "database",
  "queue",
  "worker",
  "objectStorage",
] as const;

export type NodeKind = (typeof NODE_KINDS)[number];

export type NodeId = string & { readonly __brand: "NodeId" };
export type EdgeId = string & { readonly __brand: "EdgeId" };

export type TrafficClass = "read" | "write" | "static";
export type TrafficRate = Readonly<Record<TrafficClass, number>>;

export type Vec2 = {
  readonly x: number;
  readonly y: number;
};

export const LOAD_BALANCER_ALGORITHMS = ["roundRobin", "leastConn", "ipHash"] as const;

export type LoadBalancerAlgorithm = (typeof LOAD_BALANCER_ALGORITHMS)[number];

export const DATABASE_INSTANCE_SIZES = ["small", "medium", "large", "xlarge"] as const;

export type DatabaseInstanceSize = (typeof DATABASE_INSTANCE_SIZES)[number];

export const EVICTION_POLICIES = ["lru", "lfu", "random"] as const;

export type EvictionPolicy = (typeof EVICTION_POLICIES)[number];

export const REPLICATION_MODES = ["sync", "async"] as const;

export type ReplicationMode = (typeof REPLICATION_MODES)[number];
