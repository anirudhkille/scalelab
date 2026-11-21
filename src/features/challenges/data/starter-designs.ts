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
    region: "us-east",
    zone: "a",
    params,
  };
}

function regionalNode(
  id: string,
  kind: NodeKind,
  label: string,
  x: number,
  y: number,
  region: "us-east" | "eu-west" | "ap-south",
  params: ComponentParams = defaultComponentParams(kind),
): ArchNode {
  return {
    id: asNodeId(id),
    label,
    position: { x, y },
    region,
    zone: "a",
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

function database(
  size: "small" | "medium" | "large" | "xlarge",
  readReplicas = 0,
  shards = 1,
  replication: "sync" | "async" = "async",
): ComponentParams {
  return {
    kind: "database",
    instanceSize: size,
    readReplicas,
    shards,
    replication,
  };
}

function cache(memoryGb: number): ComponentParams {
  return {
    kind: "cache",
    memoryGb,
    ttlSec: 300,
    evictionPolicy: "lru",
    writeStrategy: "writeAround",
  };
}

function cdn(hitRatio: number): ComponentParams {
  return { kind: "cdn", hitRatio };
}

function gateway(limitRps: number): ComponentParams {
  return { kind: "apiGateway", limitRps };
}

function rateLimiter(limitRps: number): ComponentParams {
  return { kind: "rateLimiter", limitRps };
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

// Ride hailing locations ----------------------------------------------------

const RIDE_HAILING: Architecture = {
  schemaVersion: 1,
  nodes: [
    node("ride-clients", "clients", "Driver apps", 40),
    node("ride-dns", "dns", "DNS", 300),
    node("ride-lb", "loadBalancer", "Load balancer", 560),
    node("ride-app", "appServer", "Location service", 820, 160, appServer(1)),
    node("ride-db", "database", "Location store", 1_080),
  ],
  edges: [
    edge("edge-ride-clients-dns", "ride-clients", "ride-dns"),
    edge("edge-ride-dns-lb", "ride-dns", "ride-lb"),
    edge("edge-ride-lb-app", "ride-lb", "ride-app"),
    edge("edge-ride-app-db", "ride-app", "ride-db"),
  ],
};

const RIDE_HAILING_REFERENCE: Architecture = {
  schemaVersion: 1,
  nodes: [
    node("ride-clients", "clients", "Driver apps", 40),
    node("ride-dns", "dns", "DNS", 300),
    node("ride-lb", "loadBalancer", "Load balancer", 560),
    node("ride-app", "appServer", "Location service", 820, 160, appServer(8)),
    node("ride-cache", "cache", "Hot locations", 1_080, 160, cache(8)),
    node("ride-db", "database", "Location store", 1_340, 160, database("medium", 1, 2)),
  ],
  edges: [
    edge("edge-ride-clients-dns", "ride-clients", "ride-dns"),
    edge("edge-ride-dns-lb", "ride-dns", "ride-lb"),
    edge("edge-ride-lb-app", "ride-lb", "ride-app"),
    edge("edge-ride-app-cache", "ride-app", "ride-cache"),
    edge("edge-ride-cache-db", "ride-cache", "ride-db"),
  ],
};

// Video streaming -----------------------------------------------------------

const VIDEO_STREAMING: Architecture = {
  schemaVersion: 1,
  nodes: [
    node("video-clients", "clients", "Viewers", 40),
    node("video-cdn", "cdn", "CDN", 300),
    node("video-lb", "loadBalancer", "Load balancer", 560),
    node("video-app", "appServer", "Stream service", 820, 160, appServer(1)),
    node("video-storage", "objectStorage", "Video bucket", 1_080, 60),
    node("video-db", "database", "Catalog", 1_080, 260, database("small")),
  ],
  edges: [
    edge("edge-video-clients-cdn", "video-clients", "video-cdn"),
    edge("edge-video-cdn-lb", "video-cdn", "video-lb"),
    edge("edge-video-lb-app", "video-lb", "video-app"),
    edge("edge-video-app-storage", "video-app", "video-storage", ["static"]),
    edge("edge-video-app-db", "video-app", "video-db", ["read", "write"]),
  ],
};

const VIDEO_STREAMING_REFERENCE: Architecture = {
  schemaVersion: 1,
  nodes: [
    node("video-clients", "clients", "Viewers", 40),
    node("video-cdn", "cdn", "CDN", 300, 160, cdn(0.95)),
    node("video-lb", "loadBalancer", "Load balancer", 560),
    node("video-app", "appServer", "Stream service", 820, 160, appServer(6)),
    node("video-storage", "objectStorage", "Video bucket", 1_080, 60),
    node("video-db", "database", "Catalog", 1_080, 260, database("large")),
  ],
  edges: [
    edge("edge-video-clients-cdn", "video-clients", "video-cdn"),
    edge("edge-video-cdn-lb", "video-cdn", "video-lb"),
    edge("edge-video-lb-app", "video-lb", "video-app"),
    edge("edge-video-app-storage", "video-app", "video-storage", ["static"]),
    edge("edge-video-app-db", "video-app", "video-db", ["read", "write"]),
  ],
};

// Twitter-like timeline -----------------------------------------------------

const TIMELINE: Architecture = {
  schemaVersion: 1,
  nodes: [
    node("timeline-clients", "clients", "Clients", 40),
    node("timeline-dns", "dns", "DNS", 300),
    node("timeline-lb", "loadBalancer", "Load balancer", 560),
    node("timeline-app", "appServer", "Timeline service", 820, 160, appServer(1)),
    node("timeline-db", "database", "Timeline store", 1_080),
  ],
  edges: [
    edge("edge-timeline-clients-dns", "timeline-clients", "timeline-dns"),
    edge("edge-timeline-dns-lb", "timeline-dns", "timeline-lb"),
    edge("edge-timeline-lb-app", "timeline-lb", "timeline-app"),
    edge("edge-timeline-app-db", "timeline-app", "timeline-db"),
  ],
};

const TIMELINE_REFERENCE: Architecture = {
  schemaVersion: 1,
  nodes: [
    node("timeline-clients", "clients", "Clients", 40),
    node("timeline-dns", "dns", "DNS", 300),
    node("timeline-lb", "loadBalancer", "Load balancer", 560),
    node("timeline-app", "appServer", "Timeline service", 820, 160, appServer(6)),
    node("timeline-cache", "cache", "Timeline cache", 1_080, 60, cache(16)),
    node("timeline-queue", "queue", "Fan-out queue", 1_080, 260, queue(20_000, 4_000)),
    node("timeline-worker", "worker", "Fan-out workers", 1_340, 260, workers(8)),
    node("timeline-db", "database", "Timeline store", 1_600, 160, database("medium", 1)),
  ],
  edges: [
    edge("edge-timeline-clients-dns", "timeline-clients", "timeline-dns"),
    edge("edge-timeline-dns-lb", "timeline-dns", "timeline-lb"),
    edge("edge-timeline-lb-app", "timeline-lb", "timeline-app"),
    edge("edge-timeline-app-cache", "timeline-app", "timeline-cache", ["read"]),
    edge("edge-timeline-app-queue", "timeline-app", "timeline-queue", ["write"]),
    edge("edge-timeline-app-db", "timeline-app", "timeline-db", ["static"]),
    edge("edge-timeline-cache-db", "timeline-cache", "timeline-db"),
    edge("edge-timeline-queue-worker", "timeline-queue", "timeline-worker"),
    edge("edge-timeline-worker-db", "timeline-worker", "timeline-db"),
  ],
};

// Rate-limited public API ---------------------------------------------------

const RATE_LIMITED_API: Architecture = {
  schemaVersion: 1,
  nodes: [
    node("api-clients", "clients", "API clients", 40),
    node("api-dns", "dns", "DNS", 300),
    node("api-lb", "loadBalancer", "Load balancer", 560),
    node("api-app", "appServer", "API service", 820, 160, appServer(1)),
    node("api-db", "database", "API store", 1_080),
  ],
  edges: [
    edge("edge-api-clients-dns", "api-clients", "api-dns"),
    edge("edge-api-dns-lb", "api-dns", "api-lb"),
    edge("edge-api-lb-app", "api-lb", "api-app"),
    edge("edge-api-app-db", "api-app", "api-db"),
  ],
};

const RATE_LIMITED_API_REFERENCE: Architecture = {
  schemaVersion: 1,
  nodes: [
    node("api-clients", "clients", "API clients", 40),
    node("api-dns", "dns", "DNS", 260),
    node("api-gateway", "apiGateway", "API gateway", 480, 160, gateway(8_000)),
    node("api-limiter", "rateLimiter", "Rate limiter", 700, 160, rateLimiter(6_000)),
    node("api-lb", "loadBalancer", "Load balancer", 920, 160),
    node("api-app", "appServer", "API service", 1_160, 160, appServer(20)),
    node("api-cache", "cache", "Response cache", 1_400, 60, cache(4)),
    node("api-db", "database", "API store", 1_400, 260, database("medium", 1)),
  ],
  edges: [
    edge("edge-api-clients-dns", "api-clients", "api-dns"),
    edge("edge-api-dns-gateway", "api-dns", "api-gateway"),
    edge("edge-api-gateway-limiter", "api-gateway", "api-limiter"),
    edge("edge-api-limiter-lb", "api-limiter", "api-lb"),
    edge("edge-api-lb-app", "api-lb", "api-app"),
    edge("edge-api-app-cache", "api-app", "api-cache"),
    edge("edge-api-cache-db", "api-cache", "api-db"),
  ],
};

// Payments ledger -----------------------------------------------------------

const PAYMENTS: Architecture = {
  schemaVersion: 1,
  nodes: [
    node("pay-clients", "clients", "Merchants", 40),
    node("pay-dns", "dns", "DNS", 300),
    node("pay-lb", "loadBalancer", "Load balancer", 560),
    node("pay-app", "appServer", "Payment service", 820, 160, appServer(1)),
    node("pay-db", "database", "Ledger", 1_080, 160, database("small")),
  ],
  edges: [
    edge("edge-pay-clients-dns", "pay-clients", "pay-dns"),
    edge("edge-pay-dns-lb", "pay-dns", "pay-lb"),
    edge("edge-pay-lb-app", "pay-lb", "pay-app"),
    edge("edge-pay-app-db", "pay-app", "pay-db"),
  ],
};

const PAYMENTS_REFERENCE: Architecture = {
  schemaVersion: 1,
  nodes: [
    node("pay-clients", "clients", "Merchants", 40),
    node("pay-dns", "dns", "DNS", 260),
    node("pay-gateway", "apiGateway", "API gateway", 480, 160, gateway(5_000)),
    node("pay-limiter", "rateLimiter", "Abuse limiter", 700, 160, rateLimiter(4_000)),
    node("pay-lb", "loadBalancer", "Load balancer", 920, 160),
    node("pay-app", "appServer", "Payment service", 1_160, 160, appServer(6)),
    node("pay-db", "database", "Ledger", 1_420, 60, database("medium", 1, 1, "sync")),
    node("pay-assets", "objectStorage", "Static assets", 1_420, 360),
    node("pay-queue", "queue", "Receipt queue", 1_420, 260, queue(10_000, 2_000)),
    node("pay-worker", "worker", "Receipt workers", 1_680, 260, workers(4)),
  ],
  edges: [
    edge("edge-pay-clients-dns", "pay-clients", "pay-dns"),
    edge("edge-pay-dns-gateway", "pay-dns", "pay-gateway"),
    edge("edge-pay-gateway-limiter", "pay-gateway", "pay-limiter"),
    edge("edge-pay-limiter-lb", "pay-limiter", "pay-lb"),
    edge("edge-pay-lb-app", "pay-lb", "pay-app"),
    edge("edge-pay-app-db", "pay-app", "pay-db", ["read", "write"]),
    edge("edge-pay-app-assets", "pay-app", "pay-assets", ["static"]),
    edge("edge-pay-app-queue", "pay-app", "pay-queue", ["write"]),
    edge("edge-pay-queue-worker", "pay-queue", "pay-worker"),
    edge("edge-pay-worker-db", "pay-worker", "pay-db", ["write"]),
  ],
};

// Notifications fan-out -----------------------------------------------------

const NOTIFICATIONS: Architecture = {
  schemaVersion: 1,
  nodes: [
    node("notif-clients", "clients", "Product services", 40),
    node("notif-dns", "dns", "DNS", 300),
    node("notif-lb", "loadBalancer", "Load balancer", 560),
    node("notif-app", "appServer", "Notification API", 820, 160, appServer(1)),
    node("notif-db", "database", "Subscriptions", 1_080, 160, database("small")),
  ],
  edges: [
    edge("edge-notif-clients-dns", "notif-clients", "notif-dns"),
    edge("edge-notif-dns-lb", "notif-dns", "notif-lb"),
    edge("edge-notif-lb-app", "notif-lb", "notif-app"),
    edge("edge-notif-app-db", "notif-app", "notif-db"),
  ],
};

const NOTIFICATIONS_REFERENCE: Architecture = {
  schemaVersion: 1,
  nodes: [
    node("notif-clients", "clients", "Product services", 40),
    node("notif-dns", "dns", "DNS", 300),
    node("notif-lb", "loadBalancer", "Load balancer", 560),
    node("notif-app", "appServer", "Notification API", 820, 160, appServer(8)),
    node("notif-queue", "queue", "Delivery queue", 1_080, 260, queue(30_000, 6_000)),
    node("notif-worker", "worker", "Channel workers", 1_340, 260, workers(12)),
    node("notif-db", "database", "Subscriptions", 1_080, 60, database("medium", 1)),
    node("notif-assets", "objectStorage", "Email templates", 1_340, 60),
  ],
  edges: [
    edge("edge-notif-clients-dns", "notif-clients", "notif-dns"),
    edge("edge-notif-dns-lb", "notif-dns", "notif-lb"),
    edge("edge-notif-lb-app", "notif-lb", "notif-app"),
    edge("edge-notif-app-db", "notif-app", "notif-db", ["read"]),
    edge("edge-notif-app-assets", "notif-app", "notif-assets", ["static"]),
    edge("edge-notif-app-queue", "notif-app", "notif-queue", ["write"]),
    edge("edge-notif-queue-worker", "notif-queue", "notif-worker"),
    edge("edge-notif-worker-db", "notif-worker", "notif-db", ["write"]),
  ],
};

// Global multi-region service -----------------------------------------------

const GLOBAL_SERVICE: Architecture = {
  schemaVersion: 1,
  nodes: [
    node("global-clients", "clients", "Worldwide users", 40),
    node("global-dns", "dns", "Geo DNS", 300),
    node("global-lb", "loadBalancer", "Load balancer", 560),
    node("global-app", "appServer", "API service", 820, 160, appServer(1)),
    node("global-db", "database", "Primary store", 1_080, 160, database("small")),
  ],
  edges: [
    edge("edge-global-clients-dns", "global-clients", "global-dns"),
    edge("edge-global-dns-lb", "global-dns", "global-lb"),
    edge("edge-global-lb-app", "global-lb", "global-app"),
    edge("edge-global-app-db", "global-app", "global-db"),
  ],
};

const GLOBAL_SERVICE_REFERENCE: Architecture = {
  schemaVersion: 1,
  nodes: [
    node("global-clients", "clients", "Worldwide users", 40, 220),
    node("global-dns", "dns", "Geo DNS", 280, 220),
    regionalNode(
      "global-lb-us",
      "loadBalancer",
      "US load balancer",
      540,
      80,
      "us-east",
      defaultComponentParams("loadBalancer"),
    ),
    regionalNode("global-app-us", "appServer", "US API", 800, 80, "us-east", appServer(4)),
    regionalNode("global-cache-us", "cache", "US cache", 1_060, 80, "us-east", cache(8)),
    regionalNode(
      "global-lb-eu",
      "loadBalancer",
      "EU load balancer",
      540,
      220,
      "eu-west",
      defaultComponentParams("loadBalancer"),
    ),
    regionalNode("global-app-eu", "appServer", "EU API", 800, 220, "eu-west", appServer(4)),
    regionalNode("global-cache-eu", "cache", "EU cache", 1_060, 220, "eu-west", cache(8)),
    regionalNode(
      "global-lb-ap",
      "loadBalancer",
      "APAC load balancer",
      540,
      360,
      "ap-south",
      defaultComponentParams("loadBalancer"),
    ),
    regionalNode("global-app-ap", "appServer", "APAC API", 800, 360, "ap-south", appServer(4)),
    regionalNode("global-cache-ap", "cache", "APAC cache", 1_060, 360, "ap-south", cache(8)),
    regionalNode(
      "global-db",
      "database",
      "Primary store",
      1_320,
      220,
      "us-east",
      database("medium", 1),
    ),
  ],
  edges: [
    edge("edge-global-clients-dns", "global-clients", "global-dns"),
    edge("edge-global-dns-lb-us", "global-dns", "global-lb-us"),
    edge("edge-global-dns-lb-eu", "global-dns", "global-lb-eu"),
    edge("edge-global-dns-lb-ap", "global-dns", "global-lb-ap"),
    edge("edge-global-lb-us-app", "global-lb-us", "global-app-us"),
    edge("edge-global-lb-eu-app", "global-lb-eu", "global-app-eu"),
    edge("edge-global-lb-ap-app", "global-lb-ap", "global-app-ap"),
    edge("edge-global-app-us-cache", "global-app-us", "global-cache-us"),
    edge("edge-global-app-eu-cache", "global-app-eu", "global-cache-eu"),
    edge("edge-global-app-ap-cache", "global-app-ap", "global-cache-ap"),
    edge("edge-global-cache-us-db", "global-cache-us", "global-db"),
    edge("edge-global-cache-eu-db", "global-cache-eu", "global-db"),
    edge("edge-global-cache-ap-db", "global-cache-ap", "global-db"),
  ],
};

const STARTERS: Readonly<Record<string, Architecture>> = {
  "personal-blog": PERSONAL_BLOG,
  "url-shortener": URL_SHORTENER,
  "photo-feed": PHOTO_FEED,
  "chat-notifications": CHAT_NOTIFICATIONS,
  "flash-sale": FLASH_SALE,
  "ride-hailing": RIDE_HAILING,
  "video-streaming": VIDEO_STREAMING,
  "timeline-fanout": TIMELINE,
  "rate-limited-api": RATE_LIMITED_API,
  payments: PAYMENTS,
  notifications: NOTIFICATIONS,
  "global-service": GLOBAL_SERVICE,
};

const REFERENCES: Readonly<Record<string, Architecture>> = {
  "personal-blog": PERSONAL_BLOG_REFERENCE,
  "url-shortener": URL_SHORTENER_REFERENCE,
  "photo-feed": PHOTO_FEED_REFERENCE,
  "chat-notifications": CHAT_NOTIFICATIONS_REFERENCE,
  "flash-sale": FLASH_SALE_REFERENCE,
  "ride-hailing": RIDE_HAILING_REFERENCE,
  "video-streaming": VIDEO_STREAMING_REFERENCE,
  "timeline-fanout": TIMELINE_REFERENCE,
  "rate-limited-api": RATE_LIMITED_API_REFERENCE,
  payments: PAYMENTS_REFERENCE,
  notifications: NOTIFICATIONS_REFERENCE,
  "global-service": GLOBAL_SERVICE_REFERENCE,
};

export function starterArchitectureFor(challengeId: string): Architecture {
  return architectureSchema.parse(STARTERS[challengeId] ?? PERSONAL_BLOG);
}

export function referenceArchitectureFor(challengeId: string): Architecture {
  return architectureSchema.parse(REFERENCES[challengeId] ?? PERSONAL_BLOG_REFERENCE);
}
