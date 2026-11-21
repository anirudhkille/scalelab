import { z } from "zod";

import { NODE_KINDS, architectureSchema, nodeIdSchema, ratioSchema } from "@/features/architecture";

export type ChallengeId = string & { readonly __brand: "ChallengeId" };

export const challengeIdSchema = z.custom<ChallengeId>(
  (value) => typeof value === "string" && value.length > 0,
  { message: "ChallengeId must be a non-empty string" },
);

export function asChallengeId(value: string): ChallengeId {
  if (value.length === 0) {
    throw new Error("ChallengeId cannot be empty");
  }

  return value as ChallengeId;
}

export const loadStageSchema = z.object({
  durationSec: z.number().positive(),
  fromUsers: z.number().nonnegative(),
  toUsers: z.number().nonnegative(),
});

export type LoadStage = z.infer<typeof loadStageSchema>;

export const failureEventSchema = z.object({
  atSec: z.number().nonnegative(),
  kind: z.enum(["killNode", "slowNode", "azOutage"]),
  nodeId: nodeIdSchema.optional(),
});

export type FailureEvent = z.infer<typeof failureEventSchema>;

export const challengeRequirementsSchema = z.object({
  targetUsers: z.number().int().positive(),
  requestsPerUserPerSec: z.number().positive(),
  readRatio: ratioSchema,
  staticRatio: ratioSchema,
  workingSetGb: z.number().positive(),
  dataSizeGb: z.number().positive(),
  latencyP95Ms: z.number().positive(),
  maxErrorRatio: ratioSchema,
  availabilityRatio: ratioSchema.optional(),
  monthlyBudgetUsd: z.number().positive(),
});

export type ChallengeRequirements = z.infer<typeof challengeRequirementsSchema>;

export const challengeDifficultySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const challengeSchema = z.object({
  id: challengeIdSchema,
  title: z.string().min(1),
  difficulty: challengeDifficultySchema,
  concepts: z.array(z.string()),
  briefMd: z.string(),
  requirements: challengeRequirementsSchema,
  loadProfile: z.array(loadStageSchema),
  failureScenarios: z.array(failureEventSchema).optional(),
  allowedComponents: z.array(z.enum(NODE_KINDS)),
  starterArchitecture: architectureSchema.optional(),
  referenceSolution: architectureSchema.optional(),
  hints: z.array(z.string()),
  learningGoals: z.array(z.string()),
});

export type Challenge = z.infer<typeof challengeSchema>;
