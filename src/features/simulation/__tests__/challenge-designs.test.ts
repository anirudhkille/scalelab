import { describe, expect, it } from "vitest";

import {
  CHALLENGES,
  referenceArchitectureFor,
  runConfigFor,
  starterArchitectureFor,
} from "@/features/challenges";
import { runSimulation } from "@/features/simulation";

describe.each(CHALLENGES.map((challenge) => [challenge.id, challenge.title] as const))(
  "challenge designs: %s",
  (challengeId) => {
    const runConfig = runConfigFor(challengeId);

    it("fails the naive starter", () => {
      const result = runSimulation(starterArchitectureFor(challengeId), runConfig);

      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }

      expect(result.result.outcome.status).toBe("failed");
    });

    it("passes the reference solution", () => {
      const result = runSimulation(referenceArchitectureFor(challengeId), runConfig);

      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }

      expect(result.result.outcome.status).toBe("passed");
    });
  },
);
