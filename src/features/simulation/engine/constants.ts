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

/**
 * Latencies for kinds that become fully modeled in M2. Until then they behave
 * as unlimited pass-through nodes so graph authoring is not blocked.
 */
export const PLACEHOLDER_LATENCY_MS = {
  dns: 20,
  cdn: 15,
  apiGateway: 5,
  rateLimiter: 2,
  cache: 1,
  database: 20,
  queue: 5,
  worker: 10,
  objectStorage: 40,
} as const;

export const EPSILON_RPS = 1e-9;
