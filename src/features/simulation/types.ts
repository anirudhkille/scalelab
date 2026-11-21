import type { NodeId } from "@/features/architecture";
import type { LoadStage } from "@/features/challenges";

export type { LoadStage };

export type NodeSnapshot = {
  nodeId: NodeId;
  utilizationRatio: number;
  queueDepth: number;
  servedRps: number;
  droppedRps: number;
  latencyMs: number;
};

export type FailureReason =
  | { type: "errorRate"; observedRatio: number }
  | { type: "latencySlo"; observedP95Ms: number }
  | { type: "queueOverflow"; nodeId: NodeId }
  | { type: "storageExhausted"; nodeId: NodeId };

export type RunOutcome =
  | { status: "passed"; maxUsersSustained: number; costUsd: number }
  | {
      status: "failed";
      atUsers: number;
      reason: FailureReason;
      rootCauseNodeId: NodeId;
    };
