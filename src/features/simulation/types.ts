import type { EdgeId, NodeId } from "@/features/architecture";
import type {
  ChallengeRequirements,
  FailureEvent,
  LoadModifiers,
  LoadStage,
} from "@/features/challenges";

export type { LoadStage };

export type NodeSnapshot = {
  readonly nodeId: NodeId;
  readonly utilizationRatio: number;
  readonly queueDepth: number;
  readonly servedRps: number;
  readonly droppedRps: number;
  readonly latencyMs: number;
  /** Present for cache and CDN nodes. */
  readonly hitRatio?: number;
};

export type RunMetrics = {
  readonly users: number;
  readonly offeredRps: number;
  readonly servedRps: number;
  readonly droppedRps: number;
  readonly errorRatio: number;
  readonly averageLatencyMs: number;
  readonly p95LatencyMs: number;
  readonly maxUtilizationRatio: number;
  readonly monthlyCostUsd: number;
  /** Fraction of elapsed time the system answered within the error budget. */
  readonly availabilityRatio?: number;
  /** Retry feedback multiplier applied to offered load; 1 when retries are off. */
  readonly retryAmplification?: number;
};

export type EdgeSnapshot = {
  readonly edgeId: EdgeId;
  readonly rps: number;
};

export type SimulationStep = {
  readonly timeSec: number;
  readonly metrics: RunMetrics;
  readonly nodes: readonly NodeSnapshot[];
  readonly edges: readonly EdgeSnapshot[];
};

export type FailureReason =
  | { readonly type: "errorRate"; readonly observedRatio: number }
  | { readonly type: "latencySlo"; readonly observedP95Ms: number }
  | { readonly type: "queueOverflow"; readonly nodeId: NodeId }
  | { readonly type: "storageExhausted"; readonly nodeId: NodeId }
  | { readonly type: "timeout"; readonly elapsedSec: number };

export type RunOutcome =
  | {
      readonly status: "passed";
      readonly maxUsersSustained: number;
      readonly costUsd: number;
    }
  | {
      readonly status: "failed";
      readonly atUsers: number;
      readonly reason: FailureReason;
      readonly rootCauseNodeId: NodeId;
    };

export type SimulationConfig = {
  readonly requirements: ChallengeRequirements;
  readonly loadProfile: readonly LoadStage[];
  /** Simulated seconds per tick. Defaults to 0.1. */
  readonly dtSec?: number;
  /** Hard stop for a run so a broken design cannot loop forever. */
  readonly maxSimulatedSec?: number;
  /** Timed failure injections applied during the run. */
  readonly failureScenarios?: readonly FailureEvent[];
  /** Optional harsh-load modifiers: retries, waves, hot keys, cache flushes. */
  readonly loadModifiers?: LoadModifiers;
};

export type RunResult = {
  readonly outcome: RunOutcome;
  readonly finalStep: SimulationStep;
  readonly maxUsersSustained: number;
  readonly monthlyCostUsd: number;
  readonly availabilityRatio?: number;
};
