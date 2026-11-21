import { beforeEach, describe, expect, it } from "vitest";

import { asChallengeId } from "@/features/challenges";

import { newAttemptId, type AttemptRecord } from "../schema";
import {
  MAX_ATTEMPTS_PER_CHALLENGE,
  bestStarsForChallenge,
  useAttemptStore,
} from "../store/attempt-store";

const ARCHITECTURE = { nodes: [], edges: [], schemaVersion: 1 } as const;

function attempt(challengeId: string, timestamp: number, stars: 0 | 1 | 2 | 3 = 0): AttemptRecord {
  return {
    id: newAttemptId(),
    challengeId: asChallengeId(challengeId),
    timestamp,
    maxUsersSustained: 100,
    costUsd: 80,
    stars,
    sloMet: stars > 0,
    withinBudget: stars > 1,
    architecture: ARCHITECTURE,
  };
}

beforeEach(() => {
  useAttemptStore.getState().clearAttempts();
});

describe("useAttemptStore", () => {
  it("keeps attempts newest-first", () => {
    const store = useAttemptStore.getState();
    store.addAttempt(attempt("personal-blog", 10));
    store.addAttempt(attempt("personal-blog", 30));
    store.addAttempt(attempt("personal-blog", 20));

    expect(useAttemptStore.getState().attempts.map((record) => record.timestamp)).toEqual([
      30, 20, 10,
    ]);
  });

  it("caps each challenge at the retention limit", () => {
    const store = useAttemptStore.getState();

    for (let timestamp = 0; timestamp < 25; timestamp += 1) {
      store.addAttempt(attempt("personal-blog", timestamp));
    }

    const records = useAttemptStore.getState().attempts;
    expect(records).toHaveLength(MAX_ATTEMPTS_PER_CHALLENGE);
    expect(records[0]?.timestamp).toBe(24);
    expect(records[records.length - 1]?.timestamp).toBe(5);
  });

  it("does not evict attempts from other challenges", () => {
    const store = useAttemptStore.getState();

    for (let timestamp = 0; timestamp < 25; timestamp += 1) {
      store.addAttempt(attempt("personal-blog", timestamp));
    }

    store.addAttempt(attempt("url-shortener", 100));

    const records = useAttemptStore.getState().attempts;
    expect(records).toHaveLength(MAX_ATTEMPTS_PER_CHALLENGE + 1);
    expect(records.filter((record) => record.challengeId === "url-shortener")).toHaveLength(1);
  });

  it("reports the best star count", () => {
    const records = [
      attempt("personal-blog", 1, 0),
      attempt("personal-blog", 2, 2),
      attempt("personal-blog", 3, 3),
    ];

    expect(bestStarsForChallenge(records)).toBe(3);
    expect(bestStarsForChallenge([])).toBe(0);
  });
});
