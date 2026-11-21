import { beforeEach, describe, expect, it } from "vitest";

import {
  MAX_CUSTOM_CHALLENGES,
  createCustomChallenge,
  customChallengeSchema,
  customChallengeToChallenge,
  customChallengesSchema,
  type CustomChallenge,
  type NewCustomChallengeInput,
} from "../custom";
import { useCustomChallengeStore } from "../store/custom-challenge-store";

function customInput(index = 1): NewCustomChallengeInput {
  return {
    title: `Custom service ${index}`,
    difficulty: 3,
    concepts: ["Caching"],
    briefMd: "A custom challenge used only by the test suite.",
    requirements: {
      targetUsers: 100,
      requestsPerUserPerSec: 1,
      readRatio: 0.8,
      staticRatio: 0.1,
      workingSetGb: 1,
      dataSizeGb: 2,
      latencyP95Ms: 250,
      maxErrorRatio: 0.01,
      availabilityRatio: 0.99,
      monthlyBudgetUsd: 300,
    },
    loadProfile: [{ durationSec: 30, fromUsers: 0, toUsers: 200 }],
    allowedComponents: ["clients", "loadBalancer", "appServer", "database"],
    hints: ["Start with the traffic path."],
    learningGoals: ["Understand the first bottleneck."],
    baseDesignId: "personal-blog",
  };
}

describe("custom challenges", () => {
  beforeEach(() => {
    useCustomChallengeStore.setState({ customChallenges: [] });
  });

  it("creates a prefixed custom id and converts to a runnable challenge", () => {
    const custom = createCustomChallenge(customInput());
    const challenge = customChallengeToChallenge(custom);

    expect(custom.id.startsWith("custom-")).toBe(true);
    expect(challenge.id).toBe(custom.id);
    expect(challenge.title).toBe(custom.title);
    expect(challenge.starterArchitecture?.nodes.length).toBeGreaterThan(0);
    expect(challenge.referenceSolution?.nodes.length).toBeGreaterThan(0);
  });

  it("rejects ids that would shadow built-in challenges", () => {
    const invalid = { ...createCustomChallenge(customInput()), id: "personal-blog" };

    expect(customChallengeSchema.safeParse(invalid).success).toBe(false);
  });

  it("rejects arrays larger than the custom challenge cap", () => {
    const challenges: CustomChallenge[] = Array.from(
      { length: MAX_CUSTOM_CHALLENGES + 1 },
      (_, index) => createCustomChallenge(customInput(index)),
    );

    expect(customChallengesSchema.safeParse(challenges).success).toBe(false);
  });

  it("upserts and removes saved challenges", () => {
    const first = createCustomChallenge(customInput(1));
    const second = createCustomChallenge(customInput(2));
    const updated = { ...first, title: "Updated custom service" };

    useCustomChallengeStore.getState().saveCustomChallenge(first);
    useCustomChallengeStore.getState().saveCustomChallenge(second);
    useCustomChallengeStore.getState().saveCustomChallenge(updated);

    expect(useCustomChallengeStore.getState().customChallenges).toHaveLength(2);
    expect(useCustomChallengeStore.getState().customChallenges[0]?.title).toBe(
      "Updated custom service",
    );

    useCustomChallengeStore.getState().removeCustomChallenge(first.id);
    expect(useCustomChallengeStore.getState().customChallenges).toHaveLength(1);
  });
});
