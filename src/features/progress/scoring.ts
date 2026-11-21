import type { ChallengeRequirements } from "@/features/challenges";

export type AttemptStars = 0 | 1 | 2 | 3;

export type AttemptScore = {
  readonly stars: AttemptStars;
  readonly sloMet: boolean;
  readonly withinBudget: boolean;
  readonly headroomMet: boolean;
  readonly availabilityMet: boolean;
};

export type ScoreAttemptInput = {
  readonly requirements: ChallengeRequirements;
  readonly maxUsersSustained: number;
  readonly monthlyCostUsd: number;
  readonly availabilityRatio?: number;
};

export function scoreAttempt(input: ScoreAttemptInput): AttemptScore {
  const { requirements } = input;
  const sloMet = input.maxUsersSustained >= requirements.targetUsers;
  const withinBudget = input.monthlyCostUsd <= requirements.monthlyBudgetUsd;
  const headroomMet = input.maxUsersSustained >= requirements.targetUsers * 2;
  const availabilityTarget = requirements.availabilityRatio ?? 0.99;
  const availabilityMet =
    input.availabilityRatio === undefined || input.availabilityRatio >= availabilityTarget;

  if (!sloMet) {
    return { stars: 0, sloMet, withinBudget, headroomMet, availabilityMet };
  }

  if (!withinBudget || !availabilityMet) {
    return { stars: 1, sloMet, withinBudget, headroomMet, availabilityMet };
  }

  return { stars: headroomMet ? 3 : 2, sloMet, withinBudget, headroomMet, availabilityMet };
}
