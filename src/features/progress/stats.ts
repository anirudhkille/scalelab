import { CHALLENGES, type Challenge } from "@/features/challenges";

import type { AttemptRecord } from "./schema";
import { bestStarsForChallenge } from "./store/attempt-store";
import type { AttemptStars } from "./scoring";

const DAY_MS = 86_400_000;

export type ChallengeProgress = {
  readonly challengeId: string;
  readonly title: string;
  readonly attempts: number;
  readonly bestStars: AttemptStars;
};

export type ProgressSummary = {
  readonly totalStars: number;
  readonly maxStars: number;
  readonly attemptedChallenges: number;
  readonly completedChallenges: number;
  readonly streakDays: number;
  readonly concepts: readonly string[];
  readonly byChallenge: readonly ChallengeProgress[];
};

function dayKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayNumber(timestamp: number): number {
  const date = new Date(timestamp);
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

export function streakDaysFromAttempts(attempts: readonly AttemptRecord[]): number {
  if (attempts.length === 0) {
    return 0;
  }

  const days = [...new Set(attempts.map((attempt) => dayNumber(attempt.timestamp)))].toSorted(
    (left, right) => right - left,
  );

  const newest = days[0] ?? 0;
  const today = dayNumber(Date.now());

  if (newest < today - 1) {
    return 0;
  }

  let streak = 1;

  for (let index = 1; index < days.length; index += 1) {
    const previous = days[index - 1] ?? 0;
    const current = days[index] ?? 0;

    if (previous - current !== 1) {
      break;
    }

    streak += 1;
  }

  return streak;
}

export function summarizeProgress(
  attempts: readonly AttemptRecord[],
  challenges: readonly Challenge[] = CHALLENGES,
): ProgressSummary {
  const byChallenge: ChallengeProgress[] = challenges.map((challenge) => {
    const challengeAttempts = attempts.filter((attempt) => attempt.challengeId === challenge.id);

    return {
      challengeId: challenge.id,
      title: challenge.title,
      attempts: challengeAttempts.length,
      bestStars: bestStarsForChallenge(challengeAttempts),
    };
  });

  const attempted = byChallenge.filter((entry) => entry.attempts > 0);
  const attemptedIds = new Set(attempted.map((entry) => entry.challengeId));
  const concepts = [
    ...new Set(
      challenges
        .filter((challenge) => attemptedIds.has(challenge.id))
        .flatMap((challenge) => challenge.concepts),
    ),
  ];

  return {
    totalStars: attempted.reduce((total, entry) => total + entry.bestStars, 0),
    maxStars: challenges.length * 3,
    attemptedChallenges: attempted.length,
    completedChallenges: attempted.filter((entry) => entry.bestStars >= 2).length,
    streakDays: streakDaysFromAttempts(attempts),
    concepts,
    byChallenge,
  };
}

export function attemptDateKey(timestamp: number): string {
  return dayKey(timestamp);
}
