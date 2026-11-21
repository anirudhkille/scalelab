import type { ChallengeRequirements } from "@/features/challenges";

export type AttemptStars = 0 | 1 | 2 | 3;

export type AttemptScore = {
  readonly stars: AttemptStars;
  readonly sloMet: boolean;
  readonly withinBudget: boolean;
  readonly headroomMet: boolean;
};

export type ScoreAttemptInput = {
  readonly requirements: ChallengeRequirements;
  readonly maxUsersSustained: number;
  readonly monthlyCostUsd: number;
};

export function scoreAttempt(input: ScoreAttemptInput): AttemptScore {
  const { requirements } = input;
  const sloMet = input.maxUsersSustained >= requirements.targetUsers;
  const withinBudget = input.monthlyCostUsd <= requirements.monthlyBudgetUsd;
  const headroomMet = input.maxUsersSustained >= requirements.targetUsers * 2;

  if (!sloMet) {
    return { stars: 0, sloMet, withinBudget, headroomMet };
  }

  if (!withinBudget) {
    return { stars: 1, sloMet, withinBudget, headroomMet };
  }

  return { stars: headroomMet ? 3 : 2, sloMet, withinBudget, headroomMet };
}
