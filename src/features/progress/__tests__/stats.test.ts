import { describe, expect, it } from "vitest";

import { asChallengeId } from "@/features/challenges";

import { newAttemptId, type AttemptRecord } from "../schema";
import { streakDaysFromAttempts, summarizeProgress } from "../stats";

const ARCHITECTURE = { nodes: [], edges: [], schemaVersion: 1 } as const;
const DAY_MS = 86_400_000;

function attempt(challengeId: string, timestamp: number, stars: 0 | 1 | 2 | 3): AttemptRecord {
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

describe("progress stats", () => {
  it("counts best stars, completed challenges, and concepts", () => {
    const now = Date.now();
    const records = [
      attempt("personal-blog", now, 2),
      attempt("personal-blog", now - DAY_MS, 3),
      attempt("url-shortener", now, 0),
    ];

    const summary = summarizeProgress(records);

    expect(summary.totalStars).toBe(3);
    expect(summary.maxStars).toBe(15);
    expect(summary.attemptedChallenges).toBe(2);
    expect(summary.completedChallenges).toBe(1);
    expect(summary.concepts.length).toBeGreaterThan(0);
  });

  it("counts a consecutive streak ending today", () => {
    const now = Date.now();
    const records = [
      attempt("personal-blog", now, 1),
      attempt("personal-blog", now - DAY_MS, 1),
      attempt("personal-blog", now - DAY_MS * 2, 1),
    ];

    expect(streakDaysFromAttempts(records)).toBe(3);
  });

  it("returns an empty summary without attempts", () => {
    const summary = summarizeProgress([]);

    expect(summary.totalStars).toBe(0);
    expect(summary.attemptedChallenges).toBe(0);
    expect(summary.completedChallenges).toBe(0);
    expect(summary.streakDays).toBe(0);
    expect(summary.concepts).toEqual([]);
  });
});
