import type {
  ArchEdge,
  ArchNode,
  EdgeId,
  GraphIssue,
  NodeId,
  TrafficRate,
} from "@/features/architecture/model";

import type { ChallengeRequirements, LoadModifiers } from "@/features/challenges";

import type {
  FailureReason,
  RunOutcome,
  RunResult,
  SimulationConfig,
  SimulationStep,
} from "../types";

export type MutableTrafficRate = {
  read: number;
  write: number;
  static: number;
};

export type EdgeFlow = {
  readonly edgeId: EdgeId;
  readonly rate: TrafficRate;
};

export type NodeBehaviorContext = {
  readonly node: ArchNode;
  readonly incoming: TrafficRate;
  readonly outgoingEdges: readonly ArchEdge[];
  readonly upstreamNodes: readonly ArchNode[];
  readonly requirements: ChallengeRequirements;
  readonly timeSec: number;
  readonly dtSec: number;
  readonly queueDepth: number;
  readonly loadModifiers?: LoadModifiers;
};

export type NodeBehaviorResult = {
  readonly outputs: readonly EdgeFlow[];
  readonly servedRps: number;
  readonly droppedRps: number;
  readonly queueDepth: number;
  readonly maxQueueDepth: number;
  readonly utilizationRatio: number;
  readonly latencyMs: number;
  readonly capacityRps: number;
  /** Cache/CDN hit ratio for this tick, when the component has one. */
  readonly hitRatio?: number;
};

export type NodeBehavior = (context: NodeBehaviorContext) => NodeBehaviorResult;

export type FailureBreach = {
  readonly reason: FailureReason;
  readonly rootCauseNodeId: NodeId;
};

export type SimulationEngine = {
  readonly timeSec: number;
  readonly outcome: RunOutcome | null;
  readonly maxUsersSustained: number;
  readonly monthlyCostUsd: number;
  step(): SimulationStep | null;
  run(): RunResult;
};

export type SimulationSetup =
  | { readonly ok: true; readonly engine: SimulationEngine }
  | { readonly ok: false; readonly issues: readonly GraphIssue[] };

export type SimulationRunResult =
  | { readonly ok: true; readonly result: RunResult }
  | { readonly ok: false; readonly issues: readonly GraphIssue[] };

export type EngineConfig = {
  readonly config: SimulationConfig;
  readonly dtSec: number;
  readonly maxSimulatedSec: number;
};
