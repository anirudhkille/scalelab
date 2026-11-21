import type { Architecture, NodeId } from "@/features/architecture/model";
import type { ChallengeRequirements } from "@/features/challenges";

import { CACHE_UNDERSIZED_HIT_RATIO, EPSILON_RPS, SATURATION_THRESHOLD_RATIO } from "./constants";
import { cacheSteadyHitRatio } from "./nodes/cache";
import type { FailureBreach } from "./types";
import type { NodeSnapshot, RunMetrics } from "../types";

export type FailureInput = {
  readonly requirements: ChallengeRequirements;
  readonly metrics: RunMetrics;
  readonly nodes: readonly NodeSnapshot[];
  readonly order: readonly NodeId[];
  readonly architecture?: Architecture;
  readonly storageExhaustedNodeIds?: readonly NodeId[];
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
 * A small cache can be the real bottleneck even when the database is the node
 * that overflows: every read miss lands on the database. Attribution should
 * point at the underprovisioned cache, not only the symptom.
 */
function undersizedCacheNodeId(input: FailureInput): NodeId | null {
  const architecture = input.architecture;
  if (!architecture || input.requirements.readRatio < 0.5) {
    return null;
  }

  const databaseSaturated = input.nodes.some((snapshot) => {
    const node = architecture.nodes.find((candidate) => candidate.id === snapshot.nodeId);
    return (
      node?.params.kind === "database" &&
      (snapshot.utilizationRatio >= SATURATION_THRESHOLD_RATIO || snapshot.droppedRps > EPSILON_RPS)
    );
  });

  if (!databaseSaturated) {
    return null;
  }

  const undersized = architecture.nodes.find((node) => {
    if (node.params.kind !== "cache") {
      return false;
    }

    const steadyHitRatio = cacheSteadyHitRatio(
      node.params.memoryGb,
      input.requirements.workingSetGb,
    );
    return steadyHitRatio < CACHE_UNDERSIZED_HIT_RATIO;
  });

  return undersized?.id ?? null;
}

function saturatedOrMostUtilizedNode(input: FailureInput, fallback: NodeId): NodeId {
  return (
    undersizedCacheNodeId(input) ??
    firstMatchingNode(
      input.nodes,
      input.order,
      (node) => node.utilizationRatio >= SATURATION_THRESHOLD_RATIO,
    ) ??
    mostUtilizedNode(input.nodes, fallback)
  );
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
      rootCauseNodeId: undersizedCacheNodeId(input) ?? overflowNode,
    };
  }

  const fallbackNodeId = input.order[0] ?? input.nodes[0]?.nodeId;
  if (!fallbackNodeId) {
    return null;
  }

  const storageNodeId = input.storageExhaustedNodeIds?.find((nodeId) =>
    input.order.includes(nodeId),
  );
  if (storageNodeId) {
    return {
      reason: { type: "storageExhausted", nodeId: storageNodeId },
      rootCauseNodeId: storageNodeId,
    };
  }

  if (input.metrics.errorRatio > input.requirements.maxErrorRatio) {
    return {
      reason: { type: "errorRate", observedRatio: input.metrics.errorRatio },
      rootCauseNodeId: saturatedOrMostUtilizedNode(input, fallbackNodeId),
    };
  }

  if (input.metrics.p95LatencyMs > input.requirements.latencyP95Ms) {
    return {
      reason: { type: "latencySlo", observedP95Ms: input.metrics.p95LatencyMs },
      rootCauseNodeId: saturatedOrMostUtilizedNode(input, fallbackNodeId),
    };
  }

  return null;
}
