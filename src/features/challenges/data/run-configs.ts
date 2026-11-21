import type { Challenge, ChallengeRunConfig } from "../schema";
import { challengeOrFallback } from "./catalog";

export function runConfigForChallenge(challenge: Challenge): ChallengeRunConfig {
  return {
    requirements: challenge.requirements,
    loadProfile: challenge.loadProfile,
    ...(challenge.failureScenarios ? { failureScenarios: challenge.failureScenarios } : {}),
  };
}

export function runConfigFor(challengeId: string): ChallengeRunConfig {
  return runConfigForChallenge(challengeOrFallback(challengeId));
}
