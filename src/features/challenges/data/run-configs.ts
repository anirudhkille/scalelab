import type { ChallengeRunConfig } from "../schema";
import { challengeOrFallback } from "./catalog";

export function runConfigFor(challengeId: string): ChallengeRunConfig {
  const challenge = challengeOrFallback(challengeId);

  return {
    requirements: challenge.requirements,
    loadProfile: challenge.loadProfile,
  };
}
