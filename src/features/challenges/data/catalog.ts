import { asNodeId, type NodeKind } from "@/features/architecture";

import {
  asChallengeId,
  challengeSchema,
  type Challenge,
  type ChallengeRequirements,
  type FailureEvent,
  type LoadStage,
} from "../schema";
import { referenceArchitectureFor, starterArchitectureFor } from "./starter-designs";

type RawChallenge = {
  readonly id: string;
  readonly title: string;
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
  readonly pack?: "fundamentals" | "scale" | "consistency" | "resilience";
  readonly concepts: readonly string[];
  readonly briefMd: string;
  readonly requirements: ChallengeRequirements;
  readonly loadProfile: readonly LoadStage[];
  readonly allowedComponents: readonly NodeKind[];
  readonly failureScenarios?: readonly FailureEvent[];
  readonly hints: readonly string[];
  readonly learningGoals: readonly string[];
};

const RAW_CHALLENGES = [
  {
    id: "personal-blog",
    pack: "fundamentals",
    title: "Personal Blog / Portfolio",
    difficulty: 1,
    concepts: ["static assets", "single-server limits", "CDN"],
    briefMd:
      "A personal site is mostly static pages with a few dynamic reads. It is the warm-up: find the first tier that cannot keep up when traffic ramps to double the target.",
    requirements: {
      targetUsers: 300,
      requestsPerUserPerSec: 1.4,
      readRatio: 0.85,
      staticRatio: 0.2,
      workingSetGb: 1.5,
      dataSizeGb: 2,
      latencyP95Ms: 250,
      maxErrorRatio: 0.01,
      availabilityRatio: 0.99,
      monthlyBudgetUsd: 300,
    },
    loadProfile: [
      { durationSec: 60, fromUsers: 0, toUsers: 600 },
      { durationSec: 30, fromUsers: 600, toUsers: 600 },
    ],
    allowedComponents: [
      "clients",
      "dns",
      "cdn",
      "loadBalancer",
      "appServer",
      "cache",
      "database",
      "objectStorage",
    ],
    hints: [
      "Which requests never need to reach your application server?",
      "Where does a repeated read land after the first miss?",
      "Put static traffic behind a CDN, then size the app tier for the 2x burst.",
    ],
    learningGoals: [
      "Separate static delivery from dynamic requests.",
      "See where a single app server saturates.",
      "Use headroom, not just target capacity, for bonus stars.",
    ],
  },
  {
    id: "url-shortener",
    pack: "fundamentals",
    title: "URL Shortener",
    difficulty: 2,
    concepts: ["read-heavy traffic", "cache hit ratio", "read replicas"],
    briefMd:
      "Short links are read far more often than they are created. The redirect path must survive a 100:1 read/write mix without hammering the primary database.",
    requirements: {
      targetUsers: 200,
      requestsPerUserPerSec: 2,
      readRatio: 0.95,
      staticRatio: 0.05,
      workingSetGb: 0.5,
      dataSizeGb: 1,
      latencyP95Ms: 200,
      maxErrorRatio: 0.005,
      availabilityRatio: 0.99,
      monthlyBudgetUsd: 250,
    },
    loadProfile: [
      { durationSec: 60, fromUsers: 0, toUsers: 400 },
      { durationSec: 30, fromUsers: 400, toUsers: 400 },
    ],
    allowedComponents: [
      "clients",
      "dns",
      "cdn",
      "loadBalancer",
      "apiGateway",
      "rateLimiter",
      "appServer",
      "cache",
      "database",
      "objectStorage",
    ],
    hints: [
      "What fraction of redirects could be answered from memory?",
      "Which database resource is exhausted first when reads dominate?",
      "Cache the hot links and keep writes on the primary; add replicas only if misses still hurt.",
    ],
    learningGoals: [
      "Reason about read/write ratios.",
      "Connect cache hit ratio to database load.",
      "Trade memory cost against database capacity.",
    ],
  },
  {
    id: "photo-feed",
    pack: "scale",
    title: "Photo Sharing Feed",
    difficulty: 3,
    concepts: ["static media", "CDN", "object storage", "feed cache"],
    briefMd:
      "A feed mixes large media objects with small metadata reads. Media should not pass through the application tier, and popular feeds should not hit the database every time.",
    requirements: {
      targetUsers: 500,
      requestsPerUserPerSec: 2,
      readRatio: 0.55,
      staticRatio: 0.55,
      workingSetGb: 4,
      dataSizeGb: 300,
      latencyP95Ms: 300,
      maxErrorRatio: 0.01,
      availabilityRatio: 0.995,
      monthlyBudgetUsd: 1_000,
    },
    loadProfile: [
      { durationSec: 75, fromUsers: 0, toUsers: 1_000 },
      { durationSec: 30, fromUsers: 1_000, toUsers: 1_000 },
    ],
    failureScenarios: [
      {
        atSec: 70,
        kind: "slowNode",
        nodeId: asNodeId("photo-app"),
        durationSec: 8,
        severityRatio: 0.75,
      },
    ],
    allowedComponents: [
      "clients",
      "dns",
      "cdn",
      "loadBalancer",
      "apiGateway",
      "rateLimiter",
      "appServer",
      "cache",
      "database",
      "queue",
      "worker",
      "objectStorage",
    ],
    hints: [
      "Which bytes should never be served by your feed service?",
      "Is your database holding media or only pointers to it?",
      "Use a CDN and object storage for media, then cache hot feed metadata.",
    ],
    learningGoals: [
      "Separate media delivery from metadata.",
      "Size object storage and database independently.",
      "Protect a hot read path with a cache.",
    ],
  },
  {
    id: "chat-notifications",
    pack: "consistency",
    title: "Chat / Notifications",
    difficulty: 4,
    concepts: ["write-heavy traffic", "queues", "workers", "backpressure"],
    briefMd:
      "Chat writes are bursty and fan out to many recipients. Accepting a message quickly is not the same as delivering it; queues and workers absorb the spike.",
    requirements: {
      targetUsers: 300,
      requestsPerUserPerSec: 2.2,
      readRatio: 0.3,
      staticRatio: 0.02,
      workingSetGb: 1,
      dataSizeGb: 5,
      latencyP95Ms: 250,
      maxErrorRatio: 0.01,
      availabilityRatio: 0.995,
      monthlyBudgetUsd: 950,
    },
    loadProfile: [
      { durationSec: 30, fromUsers: 0, toUsers: 600 },
      { durationSec: 20, fromUsers: 600, toUsers: 600 },
      { durationSec: 10, fromUsers: 600, toUsers: 800 },
      { durationSec: 20, fromUsers: 800, toUsers: 800 },
    ],
    failureScenarios: [
      {
        atSec: 42,
        kind: "slowNode",
        nodeId: asNodeId("chat-worker"),
        durationSec: 8,
        severityRatio: 0.65,
      },
    ],
    allowedComponents: [
      "clients",
      "dns",
      "loadBalancer",
      "apiGateway",
      "rateLimiter",
      "appServer",
      "cache",
      "database",
      "queue",
      "worker",
    ],
    hints: [
      "Does a successful write have to be stored before the sender gets a response?",
      "What absorbs a short burst that is larger than worker capacity?",
      "Put a queue between the API and the fan-out workers, then size the workers for the write rate.",
    ],
    learningGoals: [
      "Use asynchronous writes to absorb bursts.",
      "Read queue depth as a backpressure signal.",
      "Separate API capacity from worker capacity.",
    ],
  },
  {
    id: "flash-sale",
    pack: "resilience",
    title: "E-commerce Flash Sale",
    difficulty: 5,
    concepts: ["step load", "cache", "queues", "rate limiting"],
    briefMd:
      "A flash sale is not a ramp. Traffic jumps in seconds, hot products collapse into a tiny cache key space, and checkout writes must not take the store down.",
    requirements: {
      targetUsers: 500,
      requestsPerUserPerSec: 2.2,
      readRatio: 0.55,
      staticRatio: 0.03,
      workingSetGb: 2,
      dataSizeGb: 10,
      latencyP95Ms: 300,
      maxErrorRatio: 0.01,
      availabilityRatio: 0.995,
      monthlyBudgetUsd: 1_250,
    },
    loadProfile: [
      { durationSec: 10, fromUsers: 100, toUsers: 100 },
      { durationSec: 5, fromUsers: 100, toUsers: 1_000 },
      { durationSec: 35, fromUsers: 1_000, toUsers: 1_000 },
    ],
    allowedComponents: [
      "clients",
      "dns",
      "cdn",
      "loadBalancer",
      "apiGateway",
      "rateLimiter",
      "appServer",
      "cache",
      "database",
      "queue",
      "worker",
      "objectStorage",
    ],
    hints: [
      "Which traffic can you answer before it reaches checkout?",
      "What happens to the order database at the instant load doubles?",
      "Cache product reads, rate-limit abusive bursts, and queue order writes.",
    ],
    learningGoals: [
      "Recognize step load versus a gradual ramp.",
      "Combine caching, rate limiting, and queues.",
      "Keep the write path alive during a read spike.",
    ],
  },
  {
    id: "ride-hailing",
    pack: "consistency",
    title: "Ride Hailing Locations",
    difficulty: 3,
    concepts: ["write-heavy traffic", "hot data", "sharding", "cache"],
    briefMd:
      "Driver locations change every few seconds and riders read a small, hot set of nearby drivers. The write stream is constant, but most reads should never touch a single primary database.",
    requirements: {
      targetUsers: 400,
      requestsPerUserPerSec: 2.5,
      readRatio: 0.45,
      staticRatio: 0.02,
      workingSetGb: 2,
      dataSizeGb: 50,
      latencyP95Ms: 180,
      maxErrorRatio: 0.01,
      availabilityRatio: 0.995,
      monthlyBudgetUsd: 1_400,
    },
    loadProfile: [
      { durationSec: 60, fromUsers: 0, toUsers: 800 },
      { durationSec: 30, fromUsers: 800, toUsers: 800 },
    ],
    allowedComponents: [
      "clients",
      "dns",
      "loadBalancer",
      "apiGateway",
      "rateLimiter",
      "appServer",
      "cache",
      "database",
      "queue",
      "worker",
      "objectStorage",
    ],
    hints: [
      "Which records are read constantly but updated every few seconds?",
      "Can one database shard hold every city's location traffic?",
      "Cache hot locations and shard the write store across cities.",
    ],
    learningGoals: [
      "Separate hot reads from a steady write stream.",
      "Reason about shard count and replica capacity.",
      "Use cache memory to protect the primary database.",
    ],
  },
  {
    id: "video-streaming",
    pack: "scale",
    title: "Video Streaming",
    difficulty: 3,
    concepts: ["static media", "CDN hit ratio", "object storage", "bandwidth"],
    briefMd:
      "Most video bytes are static and should leave the system at the edge. The application tier only handles catalog reads and playback session writes, so a low CDN hit ratio can still overwhelm it.",
    requirements: {
      targetUsers: 800,
      requestsPerUserPerSec: 3,
      readRatio: 0.1,
      staticRatio: 0.85,
      workingSetGb: 10,
      dataSizeGb: 2_000,
      latencyP95Ms: 400,
      maxErrorRatio: 0.01,
      availabilityRatio: 0.995,
      monthlyBudgetUsd: 1_500,
    },
    loadProfile: [
      { durationSec: 60, fromUsers: 0, toUsers: 1_600 },
      { durationSec: 30, fromUsers: 1_600, toUsers: 1_600 },
    ],
    allowedComponents: [
      "clients",
      "dns",
      "cdn",
      "loadBalancer",
      "apiGateway",
      "rateLimiter",
      "appServer",
      "cache",
      "database",
      "queue",
      "worker",
      "objectStorage",
    ],
    hints: [
      "Which bytes should never enter your application tier?",
      "What happens to the origin when the cache hit ratio is too low?",
      "Keep video in object storage, raise CDN hits, and size the app tier for missed static traffic.",
    ],
    learningGoals: [
      "Model static media as edge traffic.",
      "See how CDN hit ratio changes origin load.",
      "Size object storage separately from metadata.",
    ],
  },
  {
    id: "timeline-fanout",
    pack: "scale",
    title: "Twitter-like Timeline",
    difficulty: 4,
    concepts: ["fan-out", "write amplification", "queues", "timeline cache"],
    briefMd:
      "A timeline read is small, but one post can fan out to thousands of followers. Keep the read path fast with cached timelines while fan-out work runs asynchronously through a queue.",
    requirements: {
      targetUsers: 500,
      requestsPerUserPerSec: 2,
      readRatio: 0.7,
      staticRatio: 0.05,
      workingSetGb: 4,
      dataSizeGb: 100,
      latencyP95Ms: 300,
      maxErrorRatio: 0.01,
      availabilityRatio: 0.995,
      monthlyBudgetUsd: 1_600,
    },
    loadProfile: [
      { durationSec: 60, fromUsers: 0, toUsers: 1_000 },
      { durationSec: 30, fromUsers: 1_000, toUsers: 1_000 },
    ],
    allowedComponents: [
      "clients",
      "dns",
      "cdn",
      "loadBalancer",
      "apiGateway",
      "rateLimiter",
      "appServer",
      "cache",
      "database",
      "queue",
      "worker",
      "objectStorage",
    ],
    hints: [
      "Does every follower need a write in the same request as the post?",
      "Where can a hot timeline be stored after it is assembled?",
      "Cache timeline reads and push fan-out work onto a queue and workers.",
    ],
    learningGoals: [
      "Reason about fan-out on write versus read.",
      "Use queues to absorb write amplification.",
      "Keep the read path independent from fan-out workers.",
    ],
  },
  {
    id: "rate-limited-api",
    pack: "resilience",
    title: "Rate-limited Public API",
    difficulty: 5,
    concepts: ["API gateway", "rate limiting", "cache", "read replicas"],
    briefMd:
      "A public API must reject abusive bursts before they reach expensive application work. Gateway and limiter capacity are not free, and a cache miss storm can still reach the database.",
    requirements: {
      targetUsers: 600,
      requestsPerUserPerSec: 4,
      readRatio: 0.8,
      staticRatio: 0.05,
      workingSetGb: 1,
      dataSizeGb: 10,
      latencyP95Ms: 150,
      maxErrorRatio: 0.005,
      availabilityRatio: 0.999,
      monthlyBudgetUsd: 1_800,
    },
    loadProfile: [
      { durationSec: 45, fromUsers: 0, toUsers: 1_200 },
      { durationSec: 30, fromUsers: 1_200, toUsers: 1_200 },
    ],
    allowedComponents: [
      "clients",
      "dns",
      "cdn",
      "loadBalancer",
      "apiGateway",
      "rateLimiter",
      "appServer",
      "cache",
      "database",
      "queue",
      "worker",
      "objectStorage",
    ],
    hints: [
      "Which requests should be rejected before they consume app capacity?",
      "What happens when a limiter is narrower than the target load?",
      "Put a gateway and limiter in front, then cache repeated reads before the database.",
    ],
    learningGoals: [
      "Place rate limiting before expensive work.",
      "Size gateway and limiter capacity above expected load.",
      "Protect a read-heavy API with a cache and replica capacity.",
    ],
  },
  {
    id: "payments",
    pack: "consistency",
    title: "Payments Ledger",
    difficulty: 4,
    concepts: ["write consistency", "sync replication", "idempotency", "backpressure"],
    briefMd:
      "A payment is a write that must not be lost or applied twice. Traffic ramps with a burst of checkout retries, so the ledger needs synchronous durability, idempotent requests, and a front door that sheds abuse before it reaches the primary.",
    requirements: {
      targetUsers: 400,
      requestsPerUserPerSec: 3,
      readRatio: 0.55,
      staticRatio: 0.02,
      workingSetGb: 2,
      dataSizeGb: 50,
      latencyP95Ms: 250,
      maxErrorRatio: 0.001,
      availabilityRatio: 0.999,
      monthlyBudgetUsd: 1_200,
    },
    loadProfile: [
      { durationSec: 60, fromUsers: 0, toUsers: 800 },
      { durationSec: 30, fromUsers: 800, toUsers: 800 },
    ],
    allowedComponents: [
      "clients",
      "dns",
      "loadBalancer",
      "apiGateway",
      "rateLimiter",
      "appServer",
      "cache",
      "database",
      "queue",
      "worker",
      "objectStorage",
    ],
    hints: [
      "Which write must finish before the client sees a success?",
      "Where should a duplicate retry be stopped before it becomes a second charge?",
      "Use synchronous replication for the ledger and push receipts or notifications off the request path.",
    ],
    learningGoals: [
      "Separate the durable write path from asynchronous side effects.",
      "See the write-capacity cost of synchronous replication.",
      "Size request-idempotency and rate limiting before the database.",
    ],
  },
  {
    id: "notifications",
    pack: "scale",
    title: "Notifications Fan-out",
    difficulty: 3,
    concepts: ["fan-out", "queues", "worker scaling", "retry safety"],
    briefMd:
      "One event can fan out into millions of pushes, emails, and in-app messages. The ingest path must stay fast while delivery happens asynchronously, with workers that can drain a backlog without sending the same message twice.",
    requirements: {
      targetUsers: 700,
      requestsPerUserPerSec: 2,
      readRatio: 0.4,
      staticRatio: 0.05,
      workingSetGb: 2,
      dataSizeGb: 100,
      latencyP95Ms: 300,
      maxErrorRatio: 0.01,
      availabilityRatio: 0.995,
      monthlyBudgetUsd: 1_700,
    },
    loadProfile: [
      { durationSec: 60, fromUsers: 0, toUsers: 1_400 },
      { durationSec: 30, fromUsers: 1_400, toUsers: 1_400 },
    ],
    allowedComponents: [
      "clients",
      "dns",
      "cdn",
      "loadBalancer",
      "apiGateway",
      "rateLimiter",
      "appServer",
      "cache",
      "database",
      "queue",
      "worker",
      "objectStorage",
      "searchIndex",
    ],
    hints: [
      "Does the sender need to wait for every channel to deliver?",
      "What absorbs a burst when channel providers are slower than ingest?",
      "Queue the fan-out, scale workers for delivery, and keep the subscription store off the hot path.",
    ],
    learningGoals: [
      "Decouple ingest latency from delivery latency.",
      "Size a queue and workers for burst absorption.",
      "Reason about duplicate delivery and dead-letter handling.",
    ],
  },
  {
    id: "global-service",
    pack: "resilience",
    title: "Global Multi-region Service",
    difficulty: 5,
    concepts: ["multi-region", "latency budget", "cache locality", "home-region writes"],
    briefMd:
      "Users are spread across three continents, and a round trip to a single region blows the latency target. Serve reads near the user, keep the write path honest about its home region, and prove the design still has headroom at twice the target load.",
    requirements: {
      targetUsers: 600,
      requestsPerUserPerSec: 2.5,
      readRatio: 0.8,
      staticRatio: 0.1,
      workingSetGb: 6,
      dataSizeGb: 200,
      latencyP95Ms: 350,
      maxErrorRatio: 0.01,
      availabilityRatio: 0.999,
      monthlyBudgetUsd: 2_400,
    },
    loadProfile: [
      { durationSec: 60, fromUsers: 0, toUsers: 1_200 },
      { durationSec: 30, fromUsers: 1_200, toUsers: 1_200 },
    ],
    allowedComponents: [
      "clients",
      "dns",
      "cdn",
      "loadBalancer",
      "apiGateway",
      "rateLimiter",
      "appServer",
      "cache",
      "database",
      "queue",
      "worker",
      "objectStorage",
    ],
    hints: [
      "Every cross-region hop spends part of the p95 budget.",
      "Which reads can be answered from a local cache, and which writes must go home?",
      "Place an app tier and cache in each region, then send cache misses and writes to the primary store.",
    ],
    learningGoals: [
      "Budget cross-region latency instead of ignoring it.",
      "Serve reads locally while keeping one write home region.",
      "Compare regional duplication against the monthly budget.",
    ],
  },
] as const satisfies readonly RawChallenge[];

function buildChallenge(raw: RawChallenge): Challenge {
  return challengeSchema.parse({
    ...raw,
    id: asChallengeId(raw.id),
    starterArchitecture: starterArchitectureFor(raw.id),
    referenceSolution: referenceArchitectureFor(raw.id),
  });
}

export const CHALLENGES: readonly Challenge[] = RAW_CHALLENGES.map(buildChallenge);

function fallbackChallenge(): Challenge {
  const challenge = CHALLENGES[0];

  if (!challenge) {
    throw new Error("At least one challenge is required");
  }

  return challenge;
}

export function challengeFor(challengeId: string): Challenge | null {
  return CHALLENGES.find((challenge) => challenge.id === challengeId) ?? null;
}

export function challengeOrFallback(challengeId: string): Challenge {
  return challengeFor(challengeId) ?? fallbackChallenge();
}
