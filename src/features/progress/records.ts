import type { Architecture } from "@/features/architecture";
import type { ChallengeId, ChallengeRequirements } from "@/features/challenges";

import { attemptRecordSchema, newAttemptId, type AttemptRecord } from "./schema";
import { scoreAttempt, type AttemptScore, type AttemptStars } from "./scoring";

export type CreateAttemptInput = {
  readonly challengeId: ChallengeId;
  readonly maxUsersSustained: number;
  readonly costUsd: number;
  readonly stars: AttemptStars;
  readonly sloMet: boolean;
  readonly withinBudget: boolean;
  readonly availabilityRatio?: number;
  readonly availabilityMet?: boolean;
  readonly architecture: Architecture;
  readonly failureSummary?: string;
  readonly timestamp?: number;
};

export function createAttempt(input: CreateAttemptInput): AttemptRecord {
  return attemptRecordSchema.parse({
    id: newAttemptId(),
    challengeId: input.challengeId,
    timestamp: input.timestamp ?? Date.now(),
    maxUsersSustained: input.maxUsersSustained,
    costUsd: input.costUsd,
    stars: input.stars,
    sloMet: input.sloMet,
    withinBudget: input.withinBudget,
    ...(input.availabilityRatio === undefined
      ? {}
      : { availabilityRatio: input.availabilityRatio }),
    ...(input.availabilityMet === undefined ? {} : { availabilityMet: input.availabilityMet }),
    architecture: input.architecture,
    ...(input.failureSummary === undefined ? {} : { failureSummary: input.failureSummary }),
  });
}

export type AttemptFromResultInput = {
  readonly challengeId: ChallengeId;
  readonly architecture: Architecture;
  readonly requirements: ChallengeRequirements;
  readonly maxUsersSustained: number;
  readonly costUsd: number;
  readonly availabilityRatio?: number;
  readonly failureSummary?: string;
  readonly timestamp?: number;
};

export type AttemptWithScore = {
  readonly attempt: AttemptRecord;
  readonly score: AttemptScore;
};

export function attemptFromResult(input: AttemptFromResultInput): AttemptWithScore {
  const score = scoreAttempt({
    requirements: input.requirements,
    maxUsersSustained: input.maxUsersSustained,
    monthlyCostUsd: input.costUsd,
    ...(input.availabilityRatio === undefined
      ? {}
      : { availabilityRatio: input.availabilityRatio }),
  });

  return {
    attempt: createAttempt({
      challengeId: input.challengeId,
      maxUsersSustained: input.maxUsersSustained,
      costUsd: input.costUsd,
      stars: score.stars,
      sloMet: score.sloMet,
      withinBudget: score.withinBudget,
      availabilityMet: score.availabilityMet,
      ...(input.availabilityRatio === undefined
        ? {}
        : { availabilityRatio: input.availabilityRatio }),
      architecture: input.architecture,
      ...(input.failureSummary === undefined ? {} : { failureSummary: input.failureSummary }),
      ...(input.timestamp === undefined ? {} : { timestamp: input.timestamp }),
    }),
    score,
  };
}
