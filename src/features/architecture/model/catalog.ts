import type { ArchNode, ComponentParams } from "./schema";
import type { DatabaseInstanceSize, NodeKind, ReplicationMode, TrafficClass } from "./types";

export type ComponentCatalogEntry = {
  readonly label: string;
  readonly description: string;
};

export const COMPONENT_CATALOG = {
  clients: {
    label: "Clients",
    description: "The user traffic source. Fixed by the challenge, not a real server.",
  },
  dns: {
    label: "DNS",
    description: "Resolves names to addresses. Adds a small fixed latency.",
  },
  cdn: {
    label: "CDN",
    description: "Absorbs static traffic close to users and forwards cache misses.",
  },
  loadBalancer: {
    label: "Load balancer",
    description: "Splits traffic across healthy backends and hides individual servers.",
  },
  apiGateway: {
    label: "API gateway",
    description: "Central entry point for routing, auth and request limits.",
  },
  rateLimiter: {
    label: "Rate limiter",
    description: "Rejects traffic above a configured request rate.",
  },
  appServer: {
    label: "App server",
    description: "Runs application code. Scale horizontally with instances.",
  },
  cache: {
    label: "Cache",
    description: "Serves repeated reads from memory before they reach the database.",
  },
  database: {
    label: "Database",
    description: "Durable read/write storage. Replicas and shards raise capacity.",
  },
  queue: {
    label: "Queue",
    description: "Buffers writes so a burst does not hit the database all at once.",
  },
  worker: {
    label: "Worker",
    description: "Consumes queued work and applies it to storage.",
  },
  objectStorage: {
    label: "Object storage",
    description: "Cheap, high-capacity storage for blobs and static assets.",
  },
} as const satisfies Record<NodeKind, ComponentCatalogEntry>;

export const COMPONENT_DEFAULTS = {
  clients: { kind: "clients" },
  dns: { kind: "dns" },
  cdn: { kind: "cdn", hitRatio: 0.9 },
  loadBalancer: { kind: "loadBalancer", algorithm: "roundRobin", capacityRps: 50_000 },
  apiGateway: { kind: "apiGateway", limitRps: 10_000 },
  rateLimiter: { kind: "rateLimiter", limitRps: 10_000 },
  appServer: {
    kind: "appServer",
    instances: 2,
    rpsPerInstance: 300,
    baseLatencyMs: 30,
    statefulSessions: false,
  },
  cache: {
    kind: "cache",
    memoryGb: 8,
    ttlSec: 300,
    evictionPolicy: "lru",
    writeStrategy: "writeAround",
  },
  database: {
    kind: "database",
    instanceSize: "small",
    readReplicas: 0,
    shards: 1,
    replication: "async",
  },
  queue: { kind: "queue", maxDepth: 10_000, throughputRps: 500 },
  worker: { kind: "worker", instances: 2, rpsPerInstance: 200 },
  objectStorage: { kind: "objectStorage" },
} as const satisfies Record<NodeKind, ComponentParams>;

const DATABASE_TIER_COST_USD = {
  small: 60,
  medium: 200,
  large: 600,
  xlarge: 1_800,
} as const satisfies Record<DatabaseInstanceSize, number>;

const REPLICATION_COST_FACTOR = {
  sync: 1.3,
  async: 1,
} as const satisfies Record<ReplicationMode, number>;

const COST_PER_APP_SERVER_INSTANCE_USD = 40;
const COST_PER_WORKER_INSTANCE_USD = 30;
const COST_PER_CACHE_GB_USD = 15;
const COST_PER_LOAD_BALANCER_USD = 25;
const COST_PER_CDN_USD = 50;
const COST_PER_GATEWAY_USD = 20;
const COST_PER_OBJECT_STORAGE_USD = 10;

function queueMonthlyCostUsd(throughputRps: number): number {
  if (throughputRps <= 1_000) {
    return 30;
  }

  if (throughputRps <= 10_000) {
    return 120;
  }

  return 400;
}

export function defaultComponentParams(kind: NodeKind): ComponentParams {
  return { ...COMPONENT_DEFAULTS[kind] };
}

export function architectureMonthlyCostUsd(architecture: {
  readonly nodes: readonly ArchNode[];
}): number {
  return architecture.nodes.reduce((total, node) => total + monthlyCostUsd(node.params), 0);
}

/** Illustrative monthly cost. Tunable, not a cloud pricing quote. */
export function monthlyCostUsd(params: ComponentParams): number {
  switch (params.kind) {
    case "clients":
    case "dns":
      return 0;
    case "cdn":
      return COST_PER_CDN_USD;
    case "loadBalancer":
      return COST_PER_LOAD_BALANCER_USD;
    case "apiGateway":
    case "rateLimiter":
      return COST_PER_GATEWAY_USD;
    case "appServer":
      return params.instances * COST_PER_APP_SERVER_INSTANCE_USD;
    case "cache":
      return params.memoryGb * COST_PER_CACHE_GB_USD;
    case "database": {
      const tierCost = DATABASE_TIER_COST_USD[params.instanceSize];
      const replicaFactor = 1 + params.readReplicas;
      const replicationFactor = REPLICATION_COST_FACTOR[params.replication];
      return tierCost * replicaFactor * params.shards * replicationFactor;
    }
    case "queue":
      return queueMonthlyCostUsd(params.throughputRps);
    case "worker":
      return params.instances * COST_PER_WORKER_INSTANCE_USD;
    case "objectStorage":
      return COST_PER_OBJECT_STORAGE_USD;
  }
}

export function trafficMixLabel(rate: Readonly<Record<TrafficClass, number>>): string {
  const total = rate.read + rate.write + rate.static;
  if (total <= 0) {
    return "no traffic";
  }

  const read = Math.round((rate.read / total) * 100);
  const write = Math.round((rate.write / total) * 100);
  const staticShare = Math.max(0, 100 - read - write);

  return `${read}% read / ${write}% write / ${staticShare}% static`;
}
