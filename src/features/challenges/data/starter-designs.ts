import {
  architectureSchema,
  asEdgeId,
  asNodeId,
  defaultComponentParams,
  type ArchEdge,
  type ArchNode,
  type Architecture,
  type NodeKind,
} from "@/features/architecture";

function node(id: string, kind: NodeKind, label: string, x: number): ArchNode {
  return {
    id: asNodeId(id),
    label,
    position: { x, y: 160 },
    params: defaultComponentParams(kind),
  };
}

function edge(id: string, source: string, target: string): ArchEdge {
  return {
    id: asEdgeId(id),
    source: asNodeId(source),
    target: asNodeId(target),
  };
}

const PERSONAL_BLOG: Architecture = {
  schemaVersion: 1,
  nodes: [
    node("blog-clients", "clients", "Clients", 40),
    node("blog-dns", "dns", "DNS", 300),
    node("blog-lb", "loadBalancer", "Load balancer", 560),
    node("blog-app", "appServer", "App server", 820),
    node("blog-db", "database", "Database", 1_080),
  ],
  edges: [
    edge("edge-blog-clients-dns", "blog-clients", "blog-dns"),
    edge("edge-blog-dns-lb", "blog-dns", "blog-lb"),
    edge("edge-blog-lb-app", "blog-lb", "blog-app"),
    edge("edge-blog-app-db", "blog-app", "blog-db"),
  ],
};

const URL_SHORTENER: Architecture = {
  schemaVersion: 1,
  nodes: [
    node("short-clients", "clients", "Clients", 40),
    node("short-dns", "dns", "DNS", 300),
    node("short-lb", "loadBalancer", "Load balancer", 560),
    node("short-app", "appServer", "Redirect service", 820),
    node("short-db", "database", "Link store", 1_080),
  ],
  edges: [
    edge("edge-short-clients-dns", "short-clients", "short-dns"),
    edge("edge-short-dns-lb", "short-dns", "short-lb"),
    edge("edge-short-lb-app", "short-lb", "short-app"),
    edge("edge-short-app-db", "short-app", "short-db"),
  ],
};

const STARTER_DESIGNS: Readonly<Record<string, Architecture>> = {
  "personal-blog": PERSONAL_BLOG,
  "url-shortener": URL_SHORTENER,
};

export function starterArchitectureFor(challengeId: string): Architecture {
  return architectureSchema.parse(STARTER_DESIGNS[challengeId] ?? PERSONAL_BLOG);
}
