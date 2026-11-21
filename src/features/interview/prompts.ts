import type { Architecture } from "@/features/architecture";

export type TradeoffPrompt = {
  readonly id: string;
  readonly title: string;
  readonly question: string;
  readonly notes: string;
  readonly signals: readonly string[];
};

const BASE_PROMPTS: readonly TradeoffPrompt[] = [
  {
    id: "capacity",
    title: "Capacity estimate",
    question:
      "Walk through the back-of-envelope numbers. How much traffic must this design serve at peak, and which number drives your component choices?",
    notes:
      "Start with users × requests per second, then apply a peak factor. Daily requests divide by 86,400 seconds. State the write share, working set, and growth per year separately. A strong answer names the binding constraint instead of reciting every number.",
    signals: [
      "Peak QPS and write QPS",
      "Peak-to-average factor",
      "Storage growth and working set",
      "Which estimate drove the design",
    ],
  },
  {
    id: "bottleneck",
    title: "First bottleneck",
    question:
      "Which component saturates first as load rises, and what does the system do when it does?",
    notes:
      "Name the node and the resource: connections, CPU, read IOPS, write throughput, queue depth, or network. Explain whether excess work queues, is rejected, or retries. Mention the metric you would alert on.",
    signals: [
      "Specific node and resource",
      "Queue versus reject behavior",
      "Leading indicator to monitor",
      "Mitigation order: scale, cache, shed, shard",
    ],
  },
];

const FAILURE_PROMPT: TradeoffPrompt = {
  id: "failure-mode",
  title: "Failure and blast radius",
  question:
    "Pick one realistic failure. What breaks first, what is the blast radius, and how does the design recover?",
  notes:
    "Good answers distinguish a single instance from an AZ or region. Cover retries and timeouts, idempotency, replication lag, and whether the system degrades or fails closed. Quantify the recovery target if you can.",
  signals: [
    "Failure domain",
    "User-visible impact",
    "Retry and timeout policy",
    "Recovery and data-loss bound",
  ],
};

export function buildTradeoffPrompts(architecture: Architecture): readonly TradeoffPrompt[] {
  const kinds = new Set(architecture.nodes.map((node) => node.params.kind));
  const regions = new Set(architecture.nodes.map((node) => node.region));
  const databaseNode = architecture.nodes.find((node) => node.params.kind === "database");
  const loadBalancerNode = architecture.nodes.find((node) => node.params.kind === "loadBalancer");
  const appServerNode = architecture.nodes.find((node) => node.params.kind === "appServer");
  const database = databaseNode?.params.kind === "database" ? databaseNode.params : undefined;
  const loadBalancer =
    loadBalancerNode?.params.kind === "loadBalancer" ? loadBalancerNode.params : undefined;
  const appServer = appServerNode?.params.kind === "appServer" ? appServerNode.params : undefined;
  const conditional: TradeoffPrompt[] = [];

  if (kinds.has("cache")) {
    conditional.push({
      id: "cache",
      title: "Cache strategy",
      question:
        "Why put a cache here? What happens on a miss, and how do you keep stale data from becoming a correctness bug?",
      notes:
        "Explain the hit ratio, working-set fit, TTL and invalidation. Distinguish cache-aside from write-through or write-back. A flush or hot key must not stampede the database; mention request coalescing or jitter.",
      signals: [
        "Expected hit ratio",
        "Invalidation story",
        "Stampede protection",
        "Write strategy and durability tradeoff",
      ],
    });
  }

  if (kinds.has("queue")) {
    conditional.push({
      id: "queue",
      title: "Why a queue?",
      question:
        "Why is this work asynchronous? What does the queue absorb, what is the maximum acceptable delay, and what happens when it fills?",
      notes:
        "A queue decouples producers from consumers and absorbs bursts, but adds latency, ordering, duplicate delivery, and backlog risk. Mention idempotent consumers, retry limits, and a dead-letter path.",
      signals: [
        "Burst absorption versus added latency",
        "Consumer scaling",
        "Idempotency and retries",
        "Backlog and dead-letter handling",
      ],
    });
  }

  if (database && (database.readReplicas > 0 || database.replication === "sync")) {
    conditional.push({
      id: "replication",
      title: "Replication and consistency",
      question:
        "You added replicas. What consistency does the user see, and how do you handle replication lag or a failed primary?",
      notes:
        "Sync replication protects durability but raises write latency; async replicas scale reads but serve stale data. Name which reads can tolerate lag. Explain failover, promotion, and split-brain avoidance.",
      signals: [
        "Sync versus async tradeoff",
        "Read-your-writes requirement",
        "Lag budget",
        "Failover behavior",
      ],
    });
  }

  if (database && database.shards > 1) {
    conditional.push({
      id: "sharding",
      title: "Shard key",
      question:
        "How do you shard this data, and what happens when one key becomes hot or a shard needs to move?",
      notes:
        "A shard key should spread reads and writes and keep common queries on one shard. Hot keys, cross-shard joins, and resharding are the costs. Mention virtual shards or consistent hashing when relevant.",
      signals: [
        "Shard key choice",
        "Hot-key mitigation",
        "Cross-shard query cost",
        "Resharding plan",
      ],
    });
  }

  if (kinds.has("rateLimiter")) {
    conditional.push({
      id: "rate-limit",
      title: "Rate limiting",
      question:
        "Why reject traffic at the edge instead of queueing it? Where is the limit enforced for a user hitting many servers?",
      notes:
        "A limiter sheds load to protect the system; that is a deliberate error tradeoff. Explain per-user versus global limits, shared counters, burst allowance, and what the client sees. Compare with a gateway queue.",
      signals: [
        "Reject versus queue tradeoff",
        "Limit scope and fairness",
        "Distributed counter consistency",
        "Client-visible response",
      ],
    });
  }

  if (kinds.has("searchIndex")) {
    conditional.push({
      id: "search-index",
      title: "Search indexing cost",
      question:
        "Why a dedicated search index? How does write volume affect search capacity, and how fresh must results be?",
      notes:
        "Every write can trigger index maintenance, so write-heavy traffic consumes read capacity. Discuss batching, refresh interval, and accepting near-real-time results. The index is a derived store, not the source of truth.",
      signals: [
        "Indexing amplification",
        "Refresh and freshness target",
        "Rebuild strategy",
        "Source-of-truth boundary",
      ],
    });
  }

  if (kinds.has("cdn")) {
    conditional.push({
      id: "cdn",
      title: "CDN and origin",
      question:
        "What belongs at the edge, what must reach the origin, and how do you invalidate a bad object?",
      notes:
        "The win is hit ratio and latency, not just bandwidth. Separate immutable hashed assets from personalized responses. Explain TTLs, purge strategy, and the origin protection when the cache is cold.",
      signals: [
        "Cacheable versus personalized content",
        "Hit ratio assumption",
        "Invalidation and versioning",
        "Origin shield",
      ],
    });
  }

  if (regions.size > 1) {
    conditional.push({
      id: "multi-region",
      title: "Multi-region tradeoffs",
      question:
        "Why run in more than one region? Which data is allowed to be stale, and how do you route users?",
      notes:
        "Cross-region calls add tens of milliseconds. Active-active writes need conflict handling; active-passive needs failover. Prefer serving reads locally and keeping writes in one home region unless the requirement truly demands global writes.",
      signals: [
        "Latency budget",
        "Data residency and home region",
        "Failover mode",
        "Conflict resolution",
      ],
    });
  }

  if (
    (loadBalancer?.kind === "loadBalancer" && loadBalancer.algorithm === "ipHash") ||
    (appServer?.kind === "appServer" && appServer.statefulSessions)
  ) {
    conditional.push({
      id: "sessions",
      title: "Sticky sessions",
      question:
        "Why does this design keep state on the app server, and what happens when that server or connection disappears?",
      notes:
        "Sticky routing helps local session state but hurts balance and failover. The usual answer is externalizing sessions to a shared store or signed tokens, then returning to round-robin or least-connections.",
      signals: [
        "Why state is local",
        "Reconnect behavior",
        "Shared session store",
        "Load-balancer algorithm",
      ],
    });
  }

  if (kinds.has("objectStorage") && conditional.length < 4) {
    conditional.push({
      id: "object-storage",
      title: "Metadata versus blobs",
      question:
        "Why keep blobs in object storage instead of the database, and where does the metadata live?",
      notes:
        "Object storage is cheap and durable but has higher latency and weaker transactional guarantees. The database should hold the pointer and permissions; the blob store holds bytes. Deletion and orphan cleanup need a plan.",
      signals: [
        "Blob versus metadata split",
        "Latency and durability",
        "Access control",
        "Orphan cleanup",
      ],
    });
  }

  return [...BASE_PROMPTS, ...conditional.slice(0, 4), FAILURE_PROMPT];
}
