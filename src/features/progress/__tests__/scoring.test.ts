import { describe, expect, it } from "vitest";

import type { ChallengeRequirements } from "@/features/challenges";

import { scoreAttempt } from "../scoring";

const requirements: ChallengeRequirements = {
  targetUsers: 100,
  requestsPerUserPerSec: 1,
  readRatio: 0.8,
  staticRatio: 0.1,
  workingSetGb: 1,
  dataSizeGb: 1,
  latencyP95Ms: 250,
  maxErrorRatio: 0.01,
  monthlyBudgetUsd: 100,
};

describe("scoreAttempt", () => {
  it("awards no stars below the target", () => {
    const score = scoreAttempt({ requirements, maxUsersSustained: 99, monthlyCostUsd: 50 });

    expect(score).toEqual({
      stars: 0,
      sloMet: false,
      withinBudget: true,
      headroomMet: false,
    });
  });

  it("awards one star for surviving the target over budget", () => {
    const score = scoreAttempt({ requirements, maxUsersSustained: 100, monthlyCostUsd: 101 });

    expect(score.stars).toBe(1);
    expect(score.sloMet).toBe(true);
    expect(score.withinBudget).toBe(false);
  });

  it("awards two stars for surviving the target within budget", () => {
    const score = scoreAttempt({ requirements, maxUsersSustained: 150, monthlyCostUsd: 100 });

    expect(score).toEqual({
      stars: 2,
      sloMet: true,
      withinBudget: true,
      headroomMet: false,
    });
  });

  it("awards three stars for surviving twice the target within budget", () => {
    const score = scoreAttempt({ requirements, maxUsersSustained: 200, monthlyCostUsd: 80 });

    expect(score).toEqual({
      stars: 3,
      sloMet: true,
      withinBudget: true,
      headroomMet: true,
    });
  });
});
