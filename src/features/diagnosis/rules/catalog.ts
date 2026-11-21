import { cacheSteadyHitRatio, CACHE_WARMUP_SEC } from "@/features/simulation";

import type { DiagnosisContext, DiagnosisRule } from "../types";

function percent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

function rootKind(context: DiagnosisContext) {
  return context.rootNode?.params.kind ?? null;
}

function hasKind(context: DiagnosisContext, kind: string): boolean {
  return context.nodes.some((node) => node.params.kind === kind);
}

function countKind(context: DiagnosisContext, kind: string): number {
  return context.nodes.filter((node) => node.params.kind === kind).length;
}

function rootLabel(context: DiagnosisContext): string {
  return context.rootNode?.label ?? "The system";
}

function hasCache(context: DiagnosisContext): boolean {
  return hasKind(context, "cache");
}

function smallestCacheHitRatio(context: DiagnosisContext): number | null {
  const caches = context.nodes.filter((node) => node.params.kind === "cache");
  if (caches.length === 0) {
    return null;
  }

  return caches.reduce((lowest, node) => {
    if (node.params.kind !== "cache") {
      return lowest;
    }

    const hitRatio = cacheSteadyHitRatio(node.params.memoryGb, context.requirements.workingSetGb);
    return Math.min(lowest, hitRatio);
  }, 1);
}

/**
 * Explain the primary bottleneck in plain English.
 *
 * Rules are intentionally ordered from specific component evidence to generic
 * fallbacks. The first match becomes the report headline.
 */
export const DIAGNOSIS_RULES: readonly DiagnosisRule[] = [
  {
    id: "db-storage",
    nodeKind: "database",
    failureTypes: ["storageExhausted"],
    trafficMix: ["readHeavy", "writeHeavy", "staticHeavy", "balanced"],
    headline: "Your database ran out of storage",
    summary: (context) =>
      `${rootLabel(context)} cannot hold the challenge's ${context.requirements.dataSizeGb} GB data set.`,
    whyItMatters:
      "Replicas and shards add read and write throughput, but the stored rows still need somewhere to live. Size storage independently from compute.",
    nudge: "How much data does each shard need to hold, and what happens when you add shards?",
    matches: (context) => context.outcome.reason.type === "storageExhausted",
  },
  {
    id: "db-read-bound",
    nodeKind: "database",
    failureTypes: ["errorRate", "latencySlo", "queueOverflow", "timeout"],
    trafficMix: ["readHeavy", "balanced"],
    headline: "Your database is read-bound",
    summary: (context) =>
      `${rootLabel(context)} is absorbing the read path. ${percent(
        context.requirements.readRatio,
      )} of dynamic traffic is reads, and every cache miss reaches the database.`,
    whyItMatters:
      "Read-heavy systems usually scale reads with caching and read replicas before making writes more expensive. A single primary carries both jobs until you separate them.",
    nudge: "What could absorb repeated reads before they reach the database?",
    matches: (context) =>
      rootKind(context) === "database" &&
      (context.trafficMix === "readHeavy" || context.trafficMix === "balanced"),
  },
  {
    id: "db-write-bound",
    nodeKind: "database",
    failureTypes: ["errorRate", "latencySlo", "queueOverflow", "timeout"],
    trafficMix: ["writeHeavy", "balanced"],
    headline: "Your database is write-bound",
    summary: (context) =>
      `${rootLabel(context)} is taking the full write path. Writes cannot use read replicas, so write capacity has to come from the primary or sharding.`,
    whyItMatters:
      "Replicas help reads, not writes. Write-heavy systems often buffer work in a queue, batch writes, or shard by key so one primary is not the ceiling.",
    nudge:
      "Which writes could be accepted quickly and applied later instead of hitting the primary immediately?",
    matches: (context) => rootKind(context) === "database" && context.trafficMix === "writeHeavy",
  },
  {
    id: "app-server-stateful",
    nodeKind: "appServer",
    failureTypes: ["errorRate", "latencySlo", "queueOverflow", "timeout"],
    trafficMix: ["readHeavy", "writeHeavy", "staticHeavy", "balanced"],
    headline: "Stateful sessions are wasting your app servers",
    summary: (context) =>
      `${rootLabel(context)} keeps sessions in memory, while the load balancer spreads requests without affinity. Requests keep landing on the wrong server.`,
    whyItMatters:
      "Round-robin balancing assumes any server can handle any request. Session affinity or external session storage removes that mismatch and restores horizontal scaling.",
    nudge: "Where should session state live so every app server can serve every user?",
    matches: (context) => {
      const node = context.rootNode;
      return (
        node?.params.kind === "appServer" &&
        node.params.statefulSessions &&
        context.architecture.nodes.some(
          (candidate) =>
            candidate.params.kind === "loadBalancer" && candidate.params.algorithm === "roundRobin",
        )
      );
    },
  },
  {
    id: "app-server-cpu",
    nodeKind: "appServer",
    failureTypes: ["errorRate", "latencySlo", "queueOverflow", "timeout"],
    trafficMix: ["readHeavy", "writeHeavy", "staticHeavy", "balanced"],
    headline: "Your app servers are out of capacity",
    summary: (context) =>
      `${rootLabel(context)} is saturated before the data layer is. Each instance has a fixed request budget, so more traffic means more instances or less work per request.`,
    whyItMatters:
      "Application servers are usually horizontally scalable. Caching expensive work or adding instances is cheaper than making every request wait in a queue.",
    nudge: "Can you add app instances, or move repeated work off the request path?",
    matches: (context) => {
      const node = context.rootNode;
      return node?.params.kind === "appServer" && !node.params.statefulSessions;
    },
  },
  {
    id: "lb-capacity",
    nodeKind: "loadBalancer",
    failureTypes: ["errorRate", "latencySlo", "queueOverflow", "timeout"],
    trafficMix: ["readHeavy", "writeHeavy", "staticHeavy", "balanced"],
    headline: "Your load balancer is the bottleneck",
    summary: (context) =>
      `${rootLabel(context)} has a finite request budget. Every request crosses it before reaching the servers that do the work.`,
    whyItMatters:
      "A load balancer should be control-plane overhead, not the capacity ceiling. Raise its capacity or remove unnecessary hops from the hot path.",
    nudge: "Does every request need to pass through this layer?",
    matches: (context) => rootKind(context) === "loadBalancer",
  },
  {
    id: "lb-single-point",
    nodeKind: "loadBalancer",
    failureTypes: ["availability"],
    trafficMix: ["readHeavy", "writeHeavy", "staticHeavy", "balanced"],
    headline: "Your load balancer is a single point of failure",
    summary: (context) =>
      `${rootLabel(context)} is the only entry point. One healthy instance is not redundancy.`,
    whyItMatters:
      "Availability is about surviving a component loss, not just average throughput. A second entry path is what turns one failure into a degraded run instead of an outage.",
    nudge: "What happens to the design if this one component disappears?",
    matches: (context) =>
      rootKind(context) === "loadBalancer" && countKind(context, "loadBalancer") === 1,
  },
  {
    id: "cache-too-small",
    nodeKind: "cache",
    failureTypes: ["errorRate", "latencySlo", "queueOverflow", "timeout"],
    trafficMix: ["readHeavy", "balanced"],
    headline: "Your cache is too small to protect the database",
    summary: (context) => {
      const hitRatio = smallestCacheHitRatio(context) ?? 0;
      return `The cache covers ${percent(
        hitRatio,
      )} of reads at steady state. Most reads still reach the database.`;
    },
    whyItMatters:
      "Cache effectiveness depends on covering the hot working set. A small cache still warms up and then misses most of the traffic, which looks like a database problem from the outside.",
    nudge: "How large is the hot working set, and how much of it does the cache hold?",
    matches: (context) => {
      const hitRatio = smallestCacheHitRatio(context);
      return (
        hitRatio !== null &&
        hitRatio < 0.5 &&
        (rootKind(context) === "cache" || rootKind(context) === "database")
      );
    },
  },
  {
    id: "cache-cold-start",
    nodeKind: "cache",
    failureTypes: ["errorRate", "latencySlo", "queueOverflow", "timeout"],
    trafficMix: ["readHeavy", "balanced"],
    headline: "The cache had not warmed up yet",
    summary: (context) =>
      `The run failed at ${context.finalStep.timeSec.toFixed(
        1,
      )}s, before the cache's ${CACHE_WARMUP_SEC}s warm-up finished. Early reads all miss and hit the database at once.`,
    whyItMatters:
      "A cold cache creates a stampede: the component meant to protect storage is empty exactly when traffic arrives. Warm-up, request coalescing, or a gentler ramp avoids that spike.",
    nudge: "What happens to the database during the first few seconds of traffic?",
    matches: (context) =>
      hasCache(context) &&
      context.finalStep.timeSec < CACHE_WARMUP_SEC &&
      rootKind(context) === "database",
  },
  {
    id: "worker-too-slow",
    nodeKind: "worker",
    failureTypes: ["errorRate", "latencySlo", "queueOverflow", "timeout"],
    trafficMix: ["writeHeavy", "balanced"],
    headline: "Your workers cannot drain the queue",
    summary: (context) =>
      `${rootLabel(context)} is the consumer bottleneck. The queue backs up while workers apply work more slowly than writes arrive.`,
    whyItMatters:
      "A queue absorbs a burst, it does not create capacity. If consumers are slower than the sustained write rate, depth and latency grow until the queue overflows.",
    nudge:
      "How many writes per second can the workers apply, and what happens when that is below the arrival rate?",
    matches: (context) => rootKind(context) === "worker",
  },
  {
    id: "queue-overflow",
    nodeKind: "queue",
    failureTypes: ["queueOverflow"],
    trafficMix: ["writeHeavy", "balanced", "readHeavy"],
    headline: "Your queue overflowed",
    summary: (context) =>
      `${rootLabel(context)} reached its depth limit, so new writes were dropped instead of buffered.`,
    whyItMatters:
      "Queue depth is a budget for temporary spikes. A sustained arrival rate above the drain rate eventually spends that budget, even if the queue looks healthy at the start.",
    nudge: "Is the queue draining fast enough, or only hiding a slower downstream component?",
    matches: (context) => rootKind(context) === "queue",
  },
  {
    id: "cdn-missing-static",
    nodeKind: null,
    failureTypes: ["errorRate", "latencySlo", "queueOverflow", "timeout"],
    trafficMix: ["staticHeavy"],
    headline: "Static traffic is reaching your servers",
    summary: (context) =>
      `${percent(
        context.requirements.staticRatio,
      )} of traffic is static, but there is no CDN in front of the application.`,
    whyItMatters:
      "Static assets are cacheable and should not consume application or database capacity. A CDN serves most of them close to users and forwards only misses.",
    nudge: "Which traffic could be served before it reaches the application at all?",
    matches: (context) => context.requirements.staticRatio >= 0.4 && !hasKind(context, "cdn"),
  },
  {
    id: "rate-limit",
    nodeKind: "rateLimiter",
    failureTypes: ["queueOverflow", "errorRate"],
    trafficMix: ["readHeavy", "writeHeavy", "staticHeavy", "balanced"],
    headline: "Your rate limiter is rejecting traffic",
    summary: (context) =>
      `${rootLabel(context)} is enforcing its configured request limit, so excess requests are dropped as 429s rather than overload errors.`,
    whyItMatters:
      "Rate limiting protects the system from abuse and spikes, but it is still a hard ceiling. Tune the limit to the capacity behind it, or prioritize the traffic that matters.",
    nudge: "Is the limit set for protection, or is it lower than the system can actually serve?",
    matches: (context) => rootKind(context) === "rateLimiter" || rootKind(context) === "apiGateway",
  },
  {
    id: "no-redundancy",
    nodeKind: null,
    failureTypes: ["availability"],
    trafficMix: ["readHeavy", "writeHeavy", "staticHeavy", "balanced"],
    headline: "This design has no redundancy",
    summary: (context) =>
      `There is only one ${rootKind(context) === "database" ? "database" : "critical component"} on the failing path.`,
    whyItMatters:
      "A design can pass a throughput test and still be fragile. Availability requires a second copy or a degraded path for every component whose loss stops the system.",
    nudge: "Which single component would take the whole request path down with it?",
    matches: (context) =>
      countKind(context, "appServer") <= 1 ||
      (countKind(context, "database") === 1 && countKind(context, "cache") === 0),
  },
  {
    id: "cost-over-budget",
    nodeKind: null,
    failureTypes: ["budget"],
    trafficMix: ["readHeavy", "writeHeavy", "staticHeavy", "balanced"],
    headline: "The design is over budget",
    summary: (context) =>
      `The estimated cost is $${context.result.monthlyCostUsd.toFixed(
        0,
      )}/month against a $${context.requirements.monthlyBudgetUsd.toFixed(0)} budget.`,
    whyItMatters:
      "Overprovisioning can make a test pass for the wrong reason. The challenge score cares about meeting the SLO at a realistic cost, not simply buying the largest instances.",
    nudge: "Which component is expensive but barely utilized?",
    matches: (context) => context.overBudget,
  },
  {
    id: "generic-overload",
    nodeKind: null,
    failureTypes: ["errorRate", "latencySlo", "queueOverflow", "timeout"],
    trafficMix: ["readHeavy", "writeHeavy", "staticHeavy", "balanced"],
    headline: "The system could not sustain the offered load",
    summary: (context) => `${rootLabel(context)} is the most utilized node when the run failed.`,
    whyItMatters:
      "Every design has a first bottleneck. Finding it is more useful than adding capacity everywhere, because the next bottleneck will simply move.",
    nudge: "Which component reaches its limit first as users increase?",
    matches: () => true,
  },
];
