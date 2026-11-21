import { assertNever } from "@/shared/lib/assert-never";

import type { ArchEdge, ArchNode, Architecture } from "./schema";
import type { NodeId, NodeKind } from "./types";

export type GraphIssue =
  | { readonly code: "no-clients" }
  | { readonly code: "multiple-clients"; readonly nodeIds: readonly NodeId[] }
  | { readonly code: "clients-has-incoming"; readonly nodeId: NodeId }
  | { readonly code: "duplicate-node-id"; readonly nodeId: NodeId }
  | { readonly code: "duplicate-edge-id"; readonly edgeId: ArchEdge["id"] }
  | { readonly code: "dangling-edge"; readonly edgeId: ArchEdge["id"] }
  | { readonly code: "self-edge"; readonly edgeId: ArchEdge["id"] }
  | { readonly code: "cycle"; readonly nodeIds: readonly NodeId[] }
  | { readonly code: "unreachable-node"; readonly nodeId: NodeId }
  | { readonly code: "missing-required-kind"; readonly kind: NodeKind };

export type ArchitectureGraph = {
  readonly architecture: Architecture;
  readonly nodes: readonly ArchNode[];
  readonly edges: readonly ArchEdge[];
  readonly nodeById: ReadonlyMap<NodeId, ArchNode>;
  readonly outgoingById: ReadonlyMap<NodeId, readonly ArchEdge[]>;
  readonly incomingById: ReadonlyMap<NodeId, readonly ArchEdge[]>;
  readonly order: readonly NodeId[];
  readonly clientId: NodeId;
};

export type ArchitectureValidation =
  | { readonly ok: true; readonly graph: ArchitectureGraph }
  | { readonly ok: false; readonly issues: readonly GraphIssue[] };

export type GraphValidationOptions = {
  readonly requiredKinds?: readonly NodeKind[];
};

function nodeKind(node: ArchNode): NodeKind {
  return node.params.kind;
}

function topologicalOrder(
  nodes: readonly ArchNode[],
  edges: readonly ArchEdge[],
): readonly NodeId[] | null {
  const indegree = new Map<NodeId, number>();
  const outgoing = new Map<NodeId, NodeId[]>();

  for (const node of nodes) {
    indegree.set(node.id, 0);
    outgoing.set(node.id, []);
  }

  for (const edge of edges) {
    if (!indegree.has(edge.source) || !indegree.has(edge.target)) {
      continue;
    }

    outgoing.get(edge.source)?.push(edge.target);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }

  const ready: NodeId[] = [];
  for (const node of nodes) {
    if ((indegree.get(node.id) ?? 0) === 0) {
      ready.push(node.id);
    }
  }

  const order: NodeId[] = [];
  while (ready.length > 0) {
    const nodeId = ready.shift();
    if (!nodeId) {
      break;
    }

    order.push(nodeId);
    for (const target of outgoing.get(nodeId) ?? []) {
      const nextIndegree = (indegree.get(target) ?? 0) - 1;
      indegree.set(target, nextIndegree);
      if (nextIndegree === 0) {
        ready.push(target);
      }
    }
  }

  return order.length === nodes.length ? order : null;
}

function cyclicNodeIds(nodes: readonly ArchNode[], edges: readonly ArchEdge[]): readonly NodeId[] {
  const indegree = new Map<NodeId, number>();
  const outgoing = new Map<NodeId, NodeId[]>();

  for (const node of nodes) {
    indegree.set(node.id, 0);
    outgoing.set(node.id, []);
  }

  for (const edge of edges) {
    if (!indegree.has(edge.source) || !indegree.has(edge.target)) {
      continue;
    }

    outgoing.get(edge.source)?.push(edge.target);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }

  const ready: NodeId[] = [];
  for (const node of nodes) {
    if ((indegree.get(node.id) ?? 0) === 0) {
      ready.push(node.id);
    }
  }

  const removed = new Set<NodeId>();
  while (ready.length > 0) {
    const nodeId = ready.shift();
    if (!nodeId) {
      break;
    }

    removed.add(nodeId);
    for (const target of outgoing.get(nodeId) ?? []) {
      const nextIndegree = (indegree.get(target) ?? 0) - 1;
      indegree.set(target, nextIndegree);
      if (nextIndegree === 0) {
        ready.push(target);
      }
    }
  }

  return nodes.map((node) => node.id).filter((nodeId) => !removed.has(nodeId));
}

function reachableFrom(start: NodeId, edges: readonly ArchEdge[]): ReadonlySet<NodeId> {
  const outgoing = new Map<NodeId, NodeId[]>();
  for (const edge of edges) {
    const targets = outgoing.get(edge.source);
    if (targets) {
      targets.push(edge.target);
    } else {
      outgoing.set(edge.source, [edge.target]);
    }
  }

  const visited = new Set<NodeId>();
  const stack: NodeId[] = [start];

  while (stack.length > 0) {
    const nodeId = stack.pop();
    if (!nodeId || visited.has(nodeId)) {
      continue;
    }

    visited.add(nodeId);
    for (const target of outgoing.get(nodeId) ?? []) {
      if (!visited.has(target)) {
        stack.push(target);
      }
    }
  }

  return visited;
}

/**
 * Validate the design and compile the adjacency maps used by the engine.
 *
 * The graph must have exactly one source (`clients`), be acyclic, and every
 * other node must be reachable from that source.
 */
export function compileArchitectureGraph(
  architecture: Architecture,
  options: GraphValidationOptions = {},
): ArchitectureValidation {
  const issues: GraphIssue[] = [];
  const nodeIds = new Set<NodeId>();
  const edgeIds = new Set<ArchEdge["id"]>();
  const clientNodes: ArchNode[] = [];

  for (const node of architecture.nodes) {
    if (nodeIds.has(node.id)) {
      issues.push({ code: "duplicate-node-id", nodeId: node.id });
    } else {
      nodeIds.add(node.id);
    }

    if (nodeKind(node) === "clients") {
      clientNodes.push(node);
    }
  }

  for (const edge of architecture.edges) {
    if (edgeIds.has(edge.id)) {
      issues.push({ code: "duplicate-edge-id", edgeId: edge.id });
    } else {
      edgeIds.add(edge.id);
    }

    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      issues.push({ code: "dangling-edge", edgeId: edge.id });
    }

    if (edge.source === edge.target) {
      issues.push({ code: "self-edge", edgeId: edge.id });
    }
  }

  if (clientNodes.length === 0) {
    issues.push({ code: "no-clients" });
  } else if (clientNodes.length > 1) {
    issues.push({
      code: "multiple-clients",
      nodeIds: clientNodes.map((node) => node.id),
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const clientNode = clientNodes[0];
  if (!clientNode) {
    return { ok: false, issues: [{ code: "no-clients" }] };
  }

  for (const edge of architecture.edges) {
    if (edge.target === clientNode.id) {
      issues.push({ code: "clients-has-incoming", nodeId: clientNode.id });
    }
  }

  const order = topologicalOrder(architecture.nodes, architecture.edges);
  if (!order) {
    issues.push({
      code: "cycle",
      nodeIds: cyclicNodeIds(architecture.nodes, architecture.edges),
    });
  }

  const reachable = reachableFrom(clientNode.id, architecture.edges);
  for (const node of architecture.nodes) {
    if (!reachable.has(node.id)) {
      issues.push({ code: "unreachable-node", nodeId: node.id });
    }
  }

  const presentKinds = new Set(architecture.nodes.map(nodeKind));
  for (const kind of options.requiredKinds ?? []) {
    if (!presentKinds.has(kind)) {
      issues.push({ code: "missing-required-kind", kind });
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const nodeById = new Map<NodeId, ArchNode>();
  const outgoingById = new Map<NodeId, ArchEdge[]>();
  const incomingById = new Map<NodeId, ArchEdge[]>();

  for (const node of architecture.nodes) {
    nodeById.set(node.id, node);
    outgoingById.set(node.id, []);
    incomingById.set(node.id, []);
  }

  for (const edge of architecture.edges) {
    outgoingById.get(edge.source)?.push(edge);
    incomingById.get(edge.target)?.push(edge);
  }

  return {
    ok: true,
    graph: {
      architecture,
      nodes: architecture.nodes,
      edges: architecture.edges,
      nodeById,
      outgoingById,
      incomingById,
      order: order ?? [],
      clientId: clientNode.id,
    },
  };
}

export function validateArchitecture(
  architecture: Architecture,
  options: GraphValidationOptions = {},
): ArchitectureValidation {
  return compileArchitectureGraph(architecture, options);
}

export function formatGraphIssue(issue: GraphIssue): string {
  switch (issue.code) {
    case "no-clients":
      return "Add a Clients node. It is the source of all simulated traffic.";
    case "multiple-clients":
      return "Use exactly one Clients node as the traffic source.";
    case "clients-has-incoming":
      return "Clients cannot receive traffic. Remove the incoming connection.";
    case "duplicate-node-id":
      return `Duplicate node id: ${issue.nodeId}.`;
    case "duplicate-edge-id":
      return `Duplicate edge id: ${issue.edgeId}.`;
    case "dangling-edge":
      return `Connection ${issue.edgeId} points at a missing node.`;
    case "self-edge":
      return "A component cannot connect to itself.";
    case "cycle":
      return "The architecture contains a cycle. Traffic must flow in one direction.";
    case "unreachable-node":
      return `Node ${issue.nodeId} is not reachable from Clients.`;
    case "missing-required-kind":
      return `This challenge requires a ${issue.kind} node.`;
    default:
      return assertNever(issue);
  }
}
