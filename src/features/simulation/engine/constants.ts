import type { DatabaseInstanceSize, ReplicationMode } from "@/features/architecture";

/**
 * Tunable simulation constants.
 *
 * These are educational approximations, not benchmarks. Keep every number here
 * so challenge authors can retune the model without touching node logic.
 */

/** Simulated seconds per tick. */
export const ENGINE_DT_SEC = 0.1;

/** A failure must remain true for this long before the run stops. */
export const FAILURE_WINDOW_SEC = 3;

/** Time the full target load must hold cleanly to count as a pass. */
export const SUCCESS_HOLD_SEC = 15;

/** Safety stop for a run that never reaches a terminal state. */
export const DEFAULT_MAX_SIMULATED_SEC = 180;

/** Users must reach this fraction of the target to start the success clock. */
export const TARGET_REACHED_RATIO = 0.999;

/** Queue capacity expressed as seconds of work at the node's capacity. */
export const APP_SERVER_QUEUE_LIMIT_SEC = 2;
export const LOAD_BALANCER_QUEUE_LIMIT_SEC = 0.5;

/** At least this many requests fit in a queue, even for very small capacities. */
export const MIN_QUEUE_DEPTH = 1;

/** p95 approximation multiplier: avg * (1 + 1.5 * utilization^3). */
export const P95_UTILIZATION_MULTIPLIER = 1.5;
export const P95_UTILIZATION_EXPONENT = 3;

/** A saturated node is at or above this utilization. */
export const SATURATION_THRESHOLD_RATIO = 0.95;

/** ipHash sends a little extra traffic to one bucket to model skew. */
export const IP_HASH_SKEW_RATIO = 0.2;

/** Cache hit ratio = (memory / working set)^0.6 * 0.98, capped at 0.98. */
export const CACHE_HIT_RATIO_EXPONENT = 0.6;
export const CACHE_HIT_RATIO_CEILING = 0.98;

/** A cold cache needs this long to reach its steady hit ratio. */
export const CACHE_WARMUP_SEC = 20;

/** Below this steady hit ratio, a cache is treated as undersized in diagnosis. */
export const CACHE_UNDERSIZED_HIT_RATIO = 0.5;

/** Per-cache-node service capacity for reads that hit. */
export const CACHE_CAPACITY_RPS = 80_000;
export const CACHE_QUEUE_LIMIT_SEC = 1;
export const CACHE_BASE_LATENCY_MS = 1;

/** CDN capacity is illustrative; the interesting limit is its hit ratio. */
export const CDN_CAPACITY_RPS = 1_000_000;
export const CDN_QUEUE_LIMIT_SEC = 0.5;
export const CDN_BASE_LATENCY_MS = 15;

/** Database tier capacities before replicas, shards and replication factors. */
export const DATABASE_CAPACITY_RPS = {
  small: { read: 2_000, write: 500 },
  medium: { read: 8_000, write: 2_000 },
  large: { read: 30_000, write: 10_000 },
  xlarge: { read: 100_000, write: 40_000 },
} as const satisfies Record<
  DatabaseInstanceSize,
  { readonly read: number; readonly write: number }
>;

/** Storage included by one shard at each instance size. */
export const DATABASE_STORAGE_GB = {
  small: 100,
  medium: 500,
  large: 2_000,
  xlarge: 8_000,
} as const satisfies Record<DatabaseInstanceSize, number>;

/** Async replication keeps full write throughput; sync costs ~30%. */
export const DATABASE_REPLICATION_WRITE_FACTOR = {
  sync: 0.7,
  async: 1,
} as const satisfies Record<ReplicationMode, number>;

/**
 * Sharding is not free: the busiest shard receives
 * `1 + 0.3 * (1 - 1/shards)` of its fair share.
 */
export const DATABASE_HOT_SHARD_SKEW_RATIO = 0.3;

export const DATABASE_QUEUE_LIMIT_SEC = 2;
export const DATABASE_BASE_LATENCY_MS = 20;

/** Extra queueing-style latency once the database is close to saturation. */
export const DATABASE_CONTENTION_LATENCY_MS = 40;

/** A queue shows accepted writes as fast; draining happens asynchronously. */
export const QUEUE_BASE_LATENCY_MS = 5;

export const WORKER_QUEUE_LIMIT_SEC = 2;
export const WORKER_BASE_LATENCY_MS = 10;

/** Stateful sessions behind a round-robin LB waste capacity on session affinity. */
export const STATEFUL_SESSION_PENALTY_RATIO = 0.7;

/** Latencies for kinds that remain pass-through in the MVP. */
export const PLACEHOLDER_LATENCY_MS = {
  dns: 20,
  apiGateway: 5,
  rateLimiter: 2,
  objectStorage: 40,
} as const;

export const EPSILON_RPS = 1e-9;
