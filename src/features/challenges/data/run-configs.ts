import { DEFAULT_LOAD_MODIFIERS, type Challenge, type ChallengeRunConfig } from "../schema";
import { challengeOrFallback } from "./catalog";

export function runConfigForChallenge(challenge: Challenge): ChallengeRunConfig {
  return {
    requirements: challenge.requirements,
    loadProfile: challenge.loadProfile,
    ...(challenge.failureScenarios ? { failureScenarios: challenge.failureScenarios } : {}),
    ...(challenge.loadModifiers ? { loadModifiers: challenge.loadModifiers } : {}),
  };
}

export function runConfigFor(challengeId: string): ChallengeRunConfig {
  return runConfigForChallenge(challengeOrFallback(challengeId));
}

/** Challenge-authored defaults, or a fully-disabled modifier set. */
export function defaultLoadModifiersFor(challenge: Challenge) {
  return challenge.loadModifiers ?? DEFAULT_LOAD_MODIFIERS;
}
