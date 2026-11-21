import {
  architectureSchema,
  asEdgeId,
  asNodeId,
  defaultComponentParams,
  type ArchEdge,
  type ArchNode,
  type Architecture,
  type ComponentParams,
  type NodeKind,
} from "@/features/architecture";

function node(
  id: string,
  kind: NodeKind,
  label: string,
  x: number,
  y = 160,
  params: ComponentParams = defaultComponentParams(kind),
): ArchNode {
  return {
    id: asNodeId(id),
    label,
    position: { x, y },
    params,
  };
}

function edge(
  id: string,
  source: string,
  target: string,
  carries?: readonly ("read" | "write" | "static")[],
): ArchEdge {
  return {
    id: asEdgeId(id),
    source: asNodeId(source),
    target: asNodeId(target),
    ...(carries ? { carries } : {}),
  };
}

function appServer(instances: number): ComponentParams {
  return {
    kind: "appServer",
    instances,
    rpsPerInstance: 300,
    baseLatencyMs: 30,
    statefulSessions: false,
  };
}

function database(size: "small" | "medium" | "large" | "xlarge"): ComponentParams {
  return {
    kind: "database",
    instanceSize: size,
    readReplicas: 0,
    shards: 1,
    replication: "async",
  };
}

function cache(memoryGb: number): ComponentParams {
  return { kind: "cache", memoryGb, ttlSec: 300, evictionPolicy: "lru" };
}

function queue(maxDepth: number, throughputRps: number): ComponentParams {
  return { kind: "queue", maxDepth, throughputRps };
}

function workers(instances: number): ComponentParams {
  return { kind: "worker", instances, rpsPerInstance: 200 };
}

// Personal blog / portfolio -------------------------------------------------

const PERSONAL_BLOG: Architecture = {
  schemaVersion: 1,
  nodes: [
    node("blog-clients", "clients", "Clients", 40),
    node("blog-dns", "dns", "DNS", 300),
    node("blog-lb", "loadBalancer", "Load balancer", 560),
    node("blog-app", "appServer", "App server", 820, 160, appServer(1)),
    node("blog-db", "database", "Database", 1_080),
  ],
  edges: [
    edge("edge-blog-clients-dns", "blog-clients", "blog-dns"),
    edge("edge-blog-dns-lb", "blog-dns", "blog-lb"),
    edge("edge-blog-lb-app", "blog-lb", "blog-app"),
    edge("edge-blog-app-db", "blog-app", "blog-db"),
  ],
};

const PERSONAL_BLOG_REFERENCE: Architecture = {
  schemaVersion: 1,
  nodes: [
    node("blog-clients", "clients", "Clients", 40),
    node("blog-dns", "dns", "DNS", 300),
    node("blog-lb", "loadBalancer", "Load balancer", 560),
    node("blog-app", "appServer", "App server", 820, 160, appServer(4)),
    node("blog-db", "database", "Database", 1_080, 160, database("small")),
  ],
  edges: [
    edge("edge-blog-clients-dns", "blog-clients", "blog-dns"),
    edge("edge-blog-dns-lb", "blog-dns", "blog-lb"),
    edge("edge-blog-lb-app", "blog-lb", "blog-app"),
    edge("edge-blog-app-db", "blog-app", "blog-db"),
  ],
};

// URL shortener -------------------------------------------------------------

const URL_SHORTENER: Architecture = {
  schemaVersion: 1,
  nodes: [
    node("short-clients", "clients", "Clients", 40),
    node("short-dns", "dns", "DNS", 300),
    node("short-lb", "loadBalancer", "Load balancer", 560),
    node("short-app", "appServer", "Redirect service", 820, 160, appServer(1)),
    node("short-db", "database", "Link store", 1_080),
  ],
  edges: [
    edge("edge-short-clients-dns", "short-clients", "short-dns"),
    edge("edge-short-dns-lb", "short-dns", "short-lb"),
    edge("edge-short-lb-app", "short-lb", "short-app"),
    edge("edge-short-app-db", "short-app", "short-db"),
  ],
};

const URL_SHORTENER_REFERENCE: Architecture = {
  schemaVersion: 1,
  nodes: [
    node("short-clients", "clients", "Clients", 40),
    node("short-dns", "dns", "DNS", 300),
    node("short-lb", "loadBalancer", "Load balancer", 560),
    node("short-app", "appServer", "Redirect service", 820, 160, appServer(3)),
    node("short-cache", "cache", "Link cache", 1_080, 160, cache(8)),
    node("short-db", "database", "Link store", 1_340, 160, database("small")),
  ],
  edges: [
    edge("edge-short-clients-dns", "short-clients", "short-dns"),
    edge("edge-short-dns-lb", "short-dns", "short-lb"),
    edge("edge-short-lb-app", "short-lb", "short-app"),
    edge("edge-short-app-cache", "short-app", "short-cache"),
    edge("edge-short-cache-db", "short-cache", "short-db"),
  ],
};

// Photo feed ----------------------------------------------------------------

const PHOTO_FEED: Architecture = {
  schemaVersion: 1,
  nodes: [
    node("photo-clients", "clients", "Clients", 40),
    node("photo-cdn", "cdn", "CDN", 300),
    node("photo-lb", "loadBalancer", "Load balancer", 560),
    node("photo-app", "appServer", "Feed service", 820),
    node("photo-storage", "objectStorage", "Media bucket", 1_080, 60),
    node("photo-db", "database", "Feed metadata", 1_080, 260),
  ],
  edges: [
    edge("edge-photo-clients-cdn", "photo-clients", "photo-cdn"),
    edge("edge-photo-cdn-lb", "photo-cdn", "photo-lb"),
    edge("edge-photo-lb-app", "photo-lb", "photo-app"),
    edge("edge-photo-app-storage", "photo-app", "photo-storage", ["static"]),
    edge("edge-photo-app-db", "photo-app", "photo-db", ["read", "write"]),
  ],
};

const PHOTO_FEED_REFERENCE: Architecture = {
  schemaVersion: 1,
  nodes: [
    node("photo-clients", "clients", "Clients", 40),
    node("photo-cdn", "cdn", "CDN", 300, 160, {
      kind: "cdn",
      hitRatio: 0.9,
    }),
    node("photo-lb", "loadBalancer", "Load balancer", 560),
    node("photo-app", "appServer", "Feed service", 820, 160, appServer(10)),
    node("photo-cache", "cache", "Feed cache", 1_080, 60, cache(16)),
    node("photo-storage", "objectStorage", "Media bucket", 1_080, 260),
    node("photo-db", "database", "Feed metadata", 1_340, 160, database("medium")),
  ],
  edges: [
    edge("edge-photo-clients-cdn", "photo-clients", "photo-cdn"),
    edge("edge-photo-cdn-lb", "photo-cdn", "photo-lb"),
    edge("edge-photo-lb-app", "photo-lb", "photo-app"),
    edge("edge-photo-app-cache", "photo-app", "photo-cache", ["read"]),
    edge("edge-photo-app-db", "photo-app", "photo-db", ["write"]),
    edge("edge-photo-app-storage", "photo-app", "photo-storage", ["static"]),
    edge("edge-photo-cache-db", "photo-cache", "photo-db"),
  ],
};

// Chat / notifications ------------------------------------------------------

const CHAT_NOTIFICATIONS: Architecture = {
  schemaVersion: 1,
  nodes: [
    node("chat-clients", "clients", "Clients", 40),
    node("chat-dns", "dns", "DNS", 300),
    node("chat-lb", "loadBalancer", "Load balancer", 560),
    node("chat-app", "appServer", "Chat service", 820),
    node("chat-queue", "queue", "Message queue", 1_080),
    node("chat-worker", "worker", "Fan-out workers", 1_340),
    node("chat-db", "database", "Message store", 1_600),
  ],
  edges: [
    edge("edge-chat-clients-dns", "chat-clients", "chat-dns"),
    edge("edge-chat-dns-lb", "chat-dns", "chat-lb"),
    edge("edge-chat-lb-app", "chat-lb", "chat-app"),
    edge("edge-chat-app-queue", "chat-app", "chat-queue"),
    edge("edge-chat-queue-worker", "chat-queue", "chat-worker"),
    edge("edge-chat-worker-db", "chat-worker", "chat-db"),
  ],
};

const CHAT_NOTIFICATIONS_REFERENCE: Architecture = {
  schemaVersion: 1,
  nodes: [
    node("chat-clients", "clients", "Clients", 40),
    node("chat-dns", "dns", "DNS", 300),
    node("chat-lb", "loadBalancer", "Load balancer", 560),
    node("chat-app", "appServer", "Chat service", 820, 160, appServer(6)),
    node("chat-queue", "queue", "Message queue", 1_080, 160, queue(50_000, 5_000)),
    node("chat-worker", "worker", "Fan-out workers", 1_340, 160, workers(10)),
    node("chat-db", "database", "Message store", 1_600, 160, database("medium")),
  ],
  edges: [
    edge("edge-chat-clients-dns", "chat-clients", "chat-dns"),
    edge("edge-chat-dns-lb", "chat-dns", "chat-lb"),
    edge("edge-chat-lb-app", "chat-lb", "chat-app"),
    edge("edge-chat-app-queue", "chat-app", "chat-queue"),
    edge("edge-chat-queue-worker", "chat-queue", "chat-worker"),
    edge("edge-chat-worker-db", "chat-worker", "chat-db"),
  ],
};

// Flash sale ----------------------------------------------------------------

const FLASH_SALE: Architecture = {
  schemaVersion: 1,
  nodes: [
    node("sale-clients", "clients", "Clients", 40),
    node("sale-dns", "dns", "DNS", 300),
    node("sale-lb", "loadBalancer", "Load balancer", 560),
    node("sale-app", "appServer", "Checkout service", 820),
    node("sale-db", "database", "Orders", 1_080),
  ],
  edges: [
    edge("edge-sale-clients-dns", "sale-clients", "sale-dns"),
    edge("edge-sale-dns-lb", "sale-dns", "sale-lb"),
    edge("edge-sale-lb-app", "sale-lb", "sale-app"),
    edge("edge-sale-app-db", "sale-app", "sale-db"),
  ],
};

const FLASH_SALE_REFERENCE: Architecture = {
  schemaVersion: 1,
  nodes: [
    node("sale-clients", "clients", "Clients", 40),
    node("sale-dns", "dns", "DNS", 300),
    node("sale-lb", "loadBalancer", "Load balancer", 560),
    node("sale-app", "appServer", "Checkout service", 820, 160, appServer(12)),
    node("sale-queue", "queue", "Order queue", 1_080, 160, queue(50_000, 5_000)),
    node("sale-worker", "worker", "Order workers", 1_340, 160, workers(10)),
    node("sale-db", "database", "Orders", 1_600, 160, database("medium")),
  ],
  edges: [
    edge("edge-sale-clients-dns", "sale-clients", "sale-dns"),
    edge("edge-sale-dns-lb", "sale-dns", "sale-lb"),
    edge("edge-sale-lb-app", "sale-lb", "sale-app"),
    edge("edge-sale-app-queue", "sale-app", "sale-queue", ["write"]),
    edge("edge-sale-app-db", "sale-app", "sale-db", ["read", "static"]),
    edge("edge-sale-queue-worker", "sale-queue", "sale-worker"),
    edge("edge-sale-worker-db", "sale-worker", "sale-db"),
  ],
};

const STARTERS: Readonly<Record<string, Architecture>> = {
  "personal-blog": PERSONAL_BLOG,
  "url-shortener": URL_SHORTENER,
  "photo-feed": PHOTO_FEED,
  "chat-notifications": CHAT_NOTIFICATIONS,
  "flash-sale": FLASH_SALE,
};

const REFERENCES: Readonly<Record<string, Architecture>> = {
  "personal-blog": PERSONAL_BLOG_REFERENCE,
  "url-shortener": URL_SHORTENER_REFERENCE,
  "photo-feed": PHOTO_FEED_REFERENCE,
  "chat-notifications": CHAT_NOTIFICATIONS_REFERENCE,
  "flash-sale": FLASH_SALE_REFERENCE,
};

export function starterArchitectureFor(challengeId: string): Architecture {
  return architectureSchema.parse(STARTERS[challengeId] ?? PERSONAL_BLOG);
}

export function referenceArchitectureFor(challengeId: string): Architecture {
  return architectureSchema.parse(REFERENCES[challengeId] ?? PERSONAL_BLOG_REFERENCE);
}
