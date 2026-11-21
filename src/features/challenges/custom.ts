import { z } from "zod";

import { NODE_KINDS } from "@/features/architecture";

import { referenceArchitectureFor, starterArchitectureFor } from "./data/starter-designs";
import {
  asChallengeId,
  challengeDifficultySchema,
  challengeIdSchema,
  challengeRequirementsSchema,
  challengeSchema,
  loadStageSchema,
  type Challenge,
} from "./schema";

export const MAX_CUSTOM_CHALLENGES = 30;

export const customChallengeSchema = z.object({
  id: challengeIdSchema.refine((id) => id.startsWith("custom-"), {
    message: "Custom challenge ids must start with custom-",
  }),
  title: z.string().min(3).max(80),
  difficulty: challengeDifficultySchema,
  concepts: z.array(z.string().min(1).max(60)).min(1).max(6),
  briefMd: z.string().min(20).max(2_000),
  requirements: challengeRequirementsSchema,
  loadProfile: z.array(loadStageSchema).min(1).max(5),
  allowedComponents: z.array(z.enum(NODE_KINDS)).min(1),
  hints: z.array(z.string().min(1).max(300)).max(3),
  learningGoals: z.array(z.string().min(1).max(160)).min(1).max(6),
  baseDesignId: z.string().min(1).max(80),
});

export type CustomChallenge = z.infer<typeof customChallengeSchema>;

export const customChallengesSchema = z.array(customChallengeSchema).max(MAX_CUSTOM_CHALLENGES);

export function newCustomChallengeId() {
  return asChallengeId(`custom-${globalThis.crypto.randomUUID()}`);
}

export type NewCustomChallengeInput = Omit<CustomChallenge, "id">;

export function createCustomChallenge(input: NewCustomChallengeInput): CustomChallenge {
  return customChallengeSchema.parse({ ...input, id: newCustomChallengeId() });
}

export function customChallengeToChallenge(custom: CustomChallenge): Challenge {
  const baseDesignId = custom.baseDesignId.startsWith("custom-")
    ? "personal-blog"
    : custom.baseDesignId;

  return challengeSchema.parse({
    id: custom.id,
    title: custom.title,
    difficulty: custom.difficulty,
    concepts: custom.concepts,
    briefMd: custom.briefMd,
    requirements: custom.requirements,
    loadProfile: custom.loadProfile,
    allowedComponents: custom.allowedComponents,
    starterArchitecture: starterArchitectureFor(baseDesignId),
    referenceSolution: referenceArchitectureFor(baseDesignId),
    hints: custom.hints,
    learningGoals: custom.learningGoals,
  });
}
