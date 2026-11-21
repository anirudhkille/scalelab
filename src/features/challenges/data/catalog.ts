import type { NodeKind } from "@/features/architecture";

import {
  asChallengeId,
  challengeSchema,
  type Challenge,
  type ChallengeRequirements,
  type LoadStage,
} from "../schema";
import { referenceArchitectureFor, starterArchitectureFor } from "./starter-designs";

type RawChallenge = {
  readonly id: string;
  readonly title: string;
  readonly difficulty: 1 | 2 | 3 | 4 | 5;
  readonly concepts: readonly string[];
  readonly briefMd: string;
  readonly requirements: ChallengeRequirements;
  readonly loadProfile: readonly LoadStage[];
  readonly allowedComponents: readonly NodeKind[];
  readonly hints: readonly string[];
  readonly learningGoals: readonly string[];
};

const RAW_CHALLENGES = [
  {
    id: "personal-blog",
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
