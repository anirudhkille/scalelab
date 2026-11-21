import type { NodeId } from "@/features/architecture";
import type { ChallengeRequirements } from "@/features/challenges";

import { EPSILON_RPS, SATURATION_THRESHOLD_RATIO } from "./constants";
import type { FailureBreach } from "./types";
import type { NodeSnapshot, RunMetrics } from "../types";

export type FailureInput = {
  readonly requirements: ChallengeRequirements;
  readonly metrics: RunMetrics;
  readonly nodes: readonly NodeSnapshot[];
  readonly order: readonly NodeId[];
};

function firstMatchingNode(
  nodes: readonly NodeSnapshot[],
  order: readonly NodeId[],
  predicate: (node: NodeSnapshot) => boolean,
): NodeId | null {
  for (const nodeId of order) {
    const snapshot = nodes.find((node) => node.nodeId === nodeId);
    if (snapshot && predicate(snapshot)) {
      return nodeId;
    }
  }

  return null;
}

function mostUtilizedNode(nodes: readonly NodeSnapshot[], fallback: NodeId): NodeId {
  let worst: NodeSnapshot | null = null;

  for (const node of nodes) {
    if (!worst || node.utilizationRatio > worst.utilizationRatio) {
      worst = node;
    }
  }

  return worst?.nodeId ?? fallback;
}

/**
 * Detect the first breach in this tick. Queue overflow is reported before
 * aggregate error/SLO breaches because it points at the component that caused
 * the damage.
 */
export function detectFailure(input: FailureInput): FailureBreach | null {
  const overflowNode = firstMatchingNode(
    input.nodes,
    input.order,
    (node) => node.droppedRps > EPSILON_RPS && node.queueDepth > 0,
  );

  if (overflowNode) {
    return {
      reason: { type: "queueOverflow", nodeId: overflowNode },
      rootCauseNodeId: overflowNode,
    };
  }

  const fallbackNodeId = input.order[0] ?? input.nodes[0]?.nodeId;
  if (!fallbackNodeId) {
    return null;
  }

  if (input.metrics.errorRatio > input.requirements.maxErrorRatio) {
    const rootCauseNodeId =
      firstMatchingNode(
        input.nodes,
        input.order,
        (node) => node.utilizationRatio >= SATURATION_THRESHOLD_RATIO,
      ) ?? mostUtilizedNode(input.nodes, fallbackNodeId);

    return {
      reason: { type: "errorRate", observedRatio: input.metrics.errorRatio },
      rootCauseNodeId,
    };
  }

  if (input.metrics.p95LatencyMs > input.requirements.latencyP95Ms) {
    const rootCauseNodeId =
      firstMatchingNode(
        input.nodes,
        input.order,
        (node) => node.utilizationRatio >= SATURATION_THRESHOLD_RATIO,
      ) ?? mostUtilizedNode(input.nodes, fallbackNodeId);

    return {
      reason: { type: "latencySlo", observedP95Ms: input.metrics.p95LatencyMs },
      rootCauseNodeId,
    };
  }

  return null;
}
