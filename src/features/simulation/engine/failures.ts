import {
  clampRatio,
  scaleTraffic,
  type ArchNode,
  type NodeId,
} from "@/features/architecture/model";
import type { FailureEvent } from "@/features/challenges";

import { SLOW_NODE_CAPACITY_RATIO, SLOW_NODE_LATENCY_MS } from "./constants";
import type { NodeBehaviorResult } from "./types";

export type FailureEffect = {
  readonly killed: boolean;
  readonly capacityFactor: number;
  readonly latencyPenaltyMs: number;
};

const NO_EFFECT: FailureEffect = {
  killed: false,
  capacityFactor: 1,
  latencyPenaltyMs: 0,
};

function eventApplies(event: FailureEvent, node: ArchNode): boolean {
  if (event.kind === "azOutage") {
    return event.zone === undefined || event.zone === node.zone;
  }

  return event.nodeId === node.id;
}

/** Resolve every active failure for one node at this simulated time. */
export function failureEffectFor(
  nodeId: NodeId,
  nodes: readonly ArchNode[],
  failures: readonly FailureEvent[],
  timeSec: number,
): FailureEffect {
  const node = nodes.find((candidate) => candidate.id === nodeId);
  if (!node || failures.length === 0) {
    return NO_EFFECT;
  }

  let killed = false;
  let capacityFactor = 1;
  let latencyPenaltyMs = 0;

  for (const event of failures) {
    const endSec = event.atSec + event.durationSec;
    if (timeSec < event.atSec || timeSec >= endSec || !eventApplies(event, node)) {
      continue;
    }

    if (event.kind === "killNode" || event.kind === "azOutage") {
      killed = true;
      continue;
    }

    capacityFactor *= clampRatio(event.severityRatio ?? SLOW_NODE_CAPACITY_RATIO);
    latencyPenaltyMs += SLOW_NODE_LATENCY_MS;
  }

  return { killed, capacityFactor, latencyPenaltyMs };
}

/**
 * Apply a failure after the normal node behavior.
 *
 * Degradation scales forwarded traffic and adds the shortfall to drops. This
 * keeps the rest of the engine unchanged while still making the node visibly
 * slower and less able to keep up.
 */
export function applyFailureEffect(
  result: NodeBehaviorResult,
  incomingRps: number,
  effect: FailureEffect,
): NodeBehaviorResult {
  if (effect.killed) {
    return {
      ...result,
      outputs: [],
      servedRps: 0,
      droppedRps: incomingRps,
      queueDepth: 0,
      utilizationRatio: 1,
      latencyMs: result.latencyMs + effect.latencyPenaltyMs,
    };
  }

  if (effect.capacityFactor >= 1 && effect.latencyPenaltyMs === 0) {
    return result;
  }

  const factor = clampRatio(effect.capacityFactor);
  const shortfallRps = result.servedRps * (1 - factor);

  return {
    ...result,
    outputs: result.outputs.map((flow) => ({
      edgeId: flow.edgeId,
      rate: scaleTraffic(flow.rate, factor),
    })),
    servedRps: result.servedRps * factor,
    droppedRps: result.droppedRps + shortfallRps,
    queueDepth: result.queueDepth + shortfallRps * 0.1,
    utilizationRatio: clampRatio(result.utilizationRatio / Math.max(factor, 0.01)),
    latencyMs: result.latencyMs + effect.latencyPenaltyMs,
  };
}
