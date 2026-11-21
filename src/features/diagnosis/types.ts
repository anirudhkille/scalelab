import type { ArchNode, Architecture, NodeId, NodeKind } from "@/features/architecture";
import type { ChallengeRequirements } from "@/features/challenges";
import type { NodeSnapshot, RunOutcome, RunResult, SimulationStep } from "@/features/simulation";

export type TrafficMix = "readHeavy" | "writeHeavy" | "staticHeavy" | "balanced";

export type DiagnosisFailureType =
  | "errorRate"
  | "latencySlo"
  | "queueOverflow"
  | "storageExhausted"
  | "timeout"
  | "budget"
  | "availability";

export const DIAGNOSIS_RULE_IDS = [
  "db-storage",
  "db-read-bound",
  "db-write-bound",
  "app-server-stateful",
  "app-server-cpu",
  "lb-capacity",
  "lb-single-point",
  "cache-too-small",
  "cache-cold-start",
  "worker-too-slow",
  "queue-overflow",
  "cdn-missing-static",
  "rate-limit",
  "no-redundancy",
  "cost-over-budget",
  "generic-overload",
] as const;

export type DiagnosisRuleId = (typeof DIAGNOSIS_RULE_IDS)[number];

export type FailedRunOutcome = Extract<RunOutcome, { readonly status: "failed" }>;

export type DiagnosisContext = {
  readonly architecture: Architecture;
  readonly requirements: ChallengeRequirements;
  readonly result: RunResult;
  readonly outcome: FailedRunOutcome;
  readonly rootNode: ArchNode | null;
  readonly rootSnapshot: NodeSnapshot | null;
  readonly trafficMix: TrafficMix;
  readonly nodes: readonly ArchNode[];
  readonly snapshots: readonly NodeSnapshot[];
  readonly finalStep: SimulationStep;
  readonly overBudget: boolean;
};

export type DiagnosisRule = {
  readonly id: DiagnosisRuleId;
  /** Component kind this rule talks about; null for architecture-level advice. */
  readonly nodeKind: NodeKind | null;
  readonly failureTypes: readonly DiagnosisFailureType[];
  readonly trafficMix: readonly TrafficMix[];
  readonly headline: string;
  readonly summary: (context: DiagnosisContext) => string;
  readonly whyItMatters: string;
  readonly nudge: string;
  readonly matches: (context: DiagnosisContext) => boolean;
};

export type DiagnosisEvidence = {
  readonly users: number;
  readonly nodeUtilizationRatio: number | null;
  readonly queueDepth: number | null;
  readonly errorRatio: number;
  readonly p95LatencyMs: number;
  readonly latencySloMs: number;
  readonly monthlyCostUsd: number;
  readonly monthlyBudgetUsd: number;
};

export type FailureDiagnosis = {
  readonly ruleId: DiagnosisRuleId;
  readonly headline: string;
  readonly primaryBottleneckNodeId: NodeId | null;
  readonly primaryBottleneckLabel: string;
  readonly summary: string;
  readonly whyItMatters: string;
  readonly nudge: string;
  readonly evidence: DiagnosisEvidence;
};
