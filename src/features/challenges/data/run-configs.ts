import type { ChallengeRunConfig } from "../schema";

const PERSONAL_BLOG: ChallengeRunConfig = {
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
};

const URL_SHORTENER: ChallengeRunConfig = {
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
};

const RUN_CONFIGS: Readonly<Record<string, ChallengeRunConfig>> = {
  "personal-blog": PERSONAL_BLOG,
  "url-shortener": URL_SHORTENER,
};

export function runConfigFor(challengeId: string): ChallengeRunConfig {
  return RUN_CONFIGS[challengeId] ?? PERSONAL_BLOG;
}
