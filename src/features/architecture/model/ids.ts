import type { EdgeId, NodeId } from "./types";

export function asNodeId(value: string): NodeId {
  if (value.length === 0) {
    throw new Error("NodeId cannot be empty");
  }

  return value as NodeId;
}

export function asEdgeId(value: string): EdgeId {
  if (value.length === 0) {
    throw new Error("EdgeId cannot be empty");
  }

  return value as EdgeId;
}

export function newNodeId(): NodeId {
  return asNodeId(`node_${globalThis.crypto.randomUUID()}`);
}

export function newEdgeId(): EdgeId {
  return asEdgeId(`edge_${globalThis.crypto.randomUUID()}`);
}
