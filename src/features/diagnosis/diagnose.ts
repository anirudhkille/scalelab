import type { Architecture } from "@/features/architecture";
import type { ChallengeRequirements } from "@/features/challenges";
import type { RunResult } from "@/features/simulation";

import { DIAGNOSIS_RULES } from "./rules/catalog";
import type { DiagnosisContext, FailureDiagnosis, TrafficMix } from "./types";

export function trafficMixFor(requirements: ChallengeRequirements): TrafficMix {
  const writeRatio = Math.max(0, 1 - requirements.readRatio - requirements.staticRatio);

  if (requirements.staticRatio >= 0.4) {
    return "staticHeavy";
  }

  if (writeRatio >= 0.5) {
    return "writeHeavy";
  }

  if (requirements.readRatio >= 0.5) {
    return "readHeavy";
  }

  return "balanced";
}

/**
 * Build the explanation for a failed run.
 *
 * The simulation decides which node failed first. This layer turns that node,
 * the challenge shape and the rule catalog into a human-readable report.
 */
export function diagnoseFailure(
  architecture: Architecture,
  requirements: ChallengeRequirements,
  result: RunResult,
): FailureDiagnosis | null {
  const outcome = result.outcome;
  if (outcome.status !== "failed") {
    return null;
  }

  const rootSnapshot =
    result.finalStep.nodes.find((snapshot) => snapshot.nodeId === outcome.rootCauseNodeId) ?? null;
  const rootNode = architecture.nodes.find((node) => node.id === outcome.rootCauseNodeId) ?? null;

  const context: DiagnosisContext = {
    architecture,
    requirements,
    result,
    outcome,
    rootNode,
    rootSnapshot,
    trafficMix: trafficMixFor(requirements),
    nodes: architecture.nodes,
    snapshots: result.finalStep.nodes,
    finalStep: result.finalStep,
    overBudget: result.monthlyCostUsd > requirements.monthlyBudgetUsd,
  };

  const rule = DIAGNOSIS_RULES.find((candidate) => candidate.matches(context));
  if (!rule) {
    return null;
  }

  return {
    ruleId: rule.id,
    headline: rule.headline,
    primaryBottleneckNodeId: rootNode?.id ?? null,
    primaryBottleneckLabel: rootNode?.label ?? "Architecture",
    summary: rule.summary(context),
    whyItMatters: rule.whyItMatters,
    nudge: rule.nudge,
    evidence: {
      users: result.finalStep.metrics.users,
      nodeUtilizationRatio: rootSnapshot?.utilizationRatio ?? null,
      queueDepth: rootSnapshot?.queueDepth ?? null,
      errorRatio: result.finalStep.metrics.errorRatio,
      p95LatencyMs: result.finalStep.metrics.p95LatencyMs,
      latencySloMs: requirements.latencyP95Ms,
      monthlyCostUsd: result.monthlyCostUsd,
      monthlyBudgetUsd: requirements.monthlyBudgetUsd,
    },
  };
}
