import {
  ZERO_TRAFFIC,
  addTraffic,
  compileArchitectureGraph,
  monthlyCostUsd,
  trafficFromLoad,
  trafficTotal,
  type ArchNode,
  type Architecture,
  type EdgeId,
  type NodeId,
  type TrafficRate,
} from "@/features/architecture/model";
import type { ChallengeRequirements } from "@/features/challenges";

import {
  DEFAULT_MAX_SIMULATED_SEC,
  ENGINE_DT_SEC,
  EPSILON_RPS,
  FAILURE_WINDOW_SEC,
  SUCCESS_HOLD_SEC,
  TARGET_REACHED_RATIO,
} from "./constants";
import { detectFailure } from "./failure";
import { usersAtTime } from "./load-profile";
import { databaseStorageExceeded } from "./nodes/database";
import { computeRunMetrics } from "./metrics";
import { nodeBehaviorFor } from "./nodes";
import type {
  FailureBreach,
  SimulationEngine,
  SimulationRunResult,
  SimulationSetup,
} from "./types";
import type {
  EdgeSnapshot,
  NodeSnapshot,
  RunMetrics,
  RunOutcome,
  RunResult,
  SimulationConfig,
  SimulationStep,
} from "../types";

function isHealthy(metrics: RunMetrics, requirements: ChallengeRequirements): boolean {
  return (
    metrics.errorRatio <= requirements.maxErrorRatio &&
    metrics.p95LatencyMs <= requirements.latencyP95Ms
  );
}

function failureKey(breach: FailureBreach): string {
  return `${breach.reason.type}:${breach.rootCauseNodeId}`;
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
 * Create a deterministic, rate-based simulation for one design.
 *
 * The engine is a pure state machine: callers drive it with `step()` for live
 * playback or `run()` to get the terminal result immediately.
 */
export function createSimulationEngine(
  architecture: Architecture,
  config: SimulationConfig,
): SimulationSetup {
  const validation = compileArchitectureGraph(architecture);
  if (!validation.ok) {
    return { ok: false, issues: validation.issues };
  }

  const { graph } = validation;
  const requirements = config.requirements;
  const dtSec = config.dtSec ?? ENGINE_DT_SEC;
  const maxSimulatedSec = config.maxSimulatedSec ?? DEFAULT_MAX_SIMULATED_SEC;
  const monthlyCost = graph.nodes.reduce((total, node) => total + monthlyCostUsd(node.params), 0);
  const storageExhaustedNodeIds = graph.nodes
    .filter(
      (node) =>
        node.params.kind === "database" &&
        databaseStorageExceeded(node.params, requirements.dataSizeGb),
    )
    .map((node) => node.id);

  const queues = new Map<NodeId, number>();
  const upstreamNodesById = new Map<NodeId, readonly ArchNode[]>();
  for (const node of graph.nodes) {
    queues.set(node.id, 0);
    const upstreamNodes = (graph.incomingById.get(node.id) ?? [])
      .map((edge) => graph.nodeById.get(edge.source))
      .filter((candidate): candidate is ArchNode => candidate !== undefined);
    upstreamNodesById.set(node.id, upstreamNodes);
  }

  let timeSec = 0;
  let outcome: RunOutcome | null = null;
  let maxUsersSustained = 0;
  let successHoldSec = 0;
  let failureHoldSec = 0;
  let activeFailureKey: string | null = null;
  let pendingBreach: FailureBreach | null = null;
  let lastStep: SimulationStep | null = null;

  function tick(): SimulationStep {
    const users = usersAtTime(config.loadProfile, timeSec);
    const offered = trafficFromLoad(
      users,
      requirements.requestsPerUserPerSec,
      requirements.readRatio,
      requirements.staticRatio,
    );
    const offeredRps = trafficTotal(offered);
    const incomingByNode = new Map<NodeId, TrafficRate>();
    const edgeById = new Map(graph.edges.map((edge) => [edge.id, edge]));
    const edgeRates = new Map<EdgeId, TrafficRate>();

    for (const node of graph.nodes) {
      incomingByNode.set(node.id, { read: 0, write: 0, static: 0 });
    }
    for (const edge of graph.edges) {
      edgeRates.set(edge.id, ZERO_TRAFFIC);
    }
    incomingByNode.set(graph.clientId, offered);

    const nodes: NodeSnapshot[] = [];

    for (const nodeId of graph.order) {
      const node = graph.nodeById.get(nodeId);
      if (!node) {
        continue;
      }

      const incoming = incomingByNode.get(node.id) ?? { read: 0, write: 0, static: 0 };
      const behavior = nodeBehaviorFor(node.params.kind);
      const result = behavior({
        node,
        incoming,
        outgoingEdges: graph.outgoingById.get(node.id) ?? [],
        upstreamNodes: upstreamNodesById.get(node.id) ?? [],
        requirements,
        timeSec,
        dtSec,
        queueDepth: queues.get(node.id) ?? 0,
      });

      queues.set(node.id, result.queueDepth);
      nodes.push({
        nodeId: node.id,
        utilizationRatio: result.utilizationRatio,
        queueDepth: result.queueDepth,
        servedRps: result.servedRps,
        droppedRps: result.droppedRps,
        latencyMs: result.latencyMs,
        ...(result.hitRatio === undefined ? {} : { hitRatio: result.hitRatio }),
      });

      for (const flow of result.outputs) {
        const edge = edgeById.get(flow.edgeId);
        if (!edge) {
          continue;
        }

        const current = incomingByNode.get(edge.target) ?? { read: 0, write: 0, static: 0 };
        incomingByNode.set(edge.target, addTraffic(current, flow.rate));

        const edgeCurrent = edgeRates.get(flow.edgeId) ?? ZERO_TRAFFIC;
        edgeRates.set(flow.edgeId, addTraffic(edgeCurrent, flow.rate));
      }
    }

    const edges: EdgeSnapshot[] = graph.edges.map((edge) => ({
      edgeId: edge.id,
      rps: trafficTotal(edgeRates.get(edge.id) ?? ZERO_TRAFFIC),
    }));

    const metrics = computeRunMetrics({
      users,
      offeredRps,
      nodes,
      monthlyCostUsd: monthlyCost,
    });

    const step: SimulationStep = {
      timeSec,
      metrics,
      nodes,
      edges,
    };

    const healthy = isHealthy(metrics, requirements);
    if (healthy) {
      maxUsersSustained = Math.max(maxUsersSustained, users);
    }

    if (healthy && users >= requirements.targetUsers * TARGET_REACHED_RATIO) {
      successHoldSec += dtSec;
    } else {
      successHoldSec = 0;
    }

    const breach = detectFailure({
      requirements,
      metrics,
      nodes,
      order: graph.order,
      architecture,
      storageExhaustedNodeIds,
    });

    if (breach) {
      const key = failureKey(breach);
      if (key === activeFailureKey) {
        failureHoldSec += dtSec;
      } else {
        activeFailureKey = key;
        failureHoldSec = dtSec;
        pendingBreach = breach;
      }

      if (failureHoldSec + EPSILON_RPS >= FAILURE_WINDOW_SEC && pendingBreach) {
        outcome = {
          status: "failed",
          atUsers: users,
          reason: pendingBreach.reason,
          rootCauseNodeId: pendingBreach.rootCauseNodeId,
        };
      }
    } else {
      activeFailureKey = null;
      failureHoldSec = 0;
      pendingBreach = null;
    }

    if (
      !outcome &&
      failureHoldSec <= EPSILON_RPS &&
      successHoldSec + EPSILON_RPS >= SUCCESS_HOLD_SEC
    ) {
      outcome = {
        status: "passed",
        maxUsersSustained,
        costUsd: monthlyCost,
      };
    }

    lastStep = step;
    timeSec += dtSec;

    if (!outcome && timeSec >= maxSimulatedSec) {
      outcome = {
        status: "failed",
        atUsers: users,
        reason: { type: "timeout", elapsedSec: maxSimulatedSec },
        rootCauseNodeId: mostUtilizedNode(nodes, graph.clientId),
      };
    }

    return step;
  }

  const engine: SimulationEngine = {
    get timeSec() {
      return timeSec;
    },
    get outcome() {
      return outcome;
    },
    get maxUsersSustained() {
      return maxUsersSustained;
    },
    get monthlyCostUsd() {
      return monthlyCost;
    },
    step() {
      if (outcome) {
        return null;
      }

      return tick();
    },
    run() {
      for (;;) {
        const step = engine.step();
        if (!step || outcome) {
          break;
        }
      }

      if (!outcome || !lastStep) {
        throw new Error("Simulation ended without an outcome");
      }

      const result: RunResult = {
        outcome,
        finalStep: lastStep,
        maxUsersSustained,
        monthlyCostUsd: monthlyCost,
      };

      return result;
    },
  };

  return { ok: true, engine };
}

export function runSimulation(
  architecture: Architecture,
  config: SimulationConfig,
): SimulationRunResult {
  const setup = createSimulationEngine(architecture, config);
  if (!setup.ok) {
    return { ok: false, issues: setup.issues };
  }

  return { ok: true, result: setup.engine.run() };
}
