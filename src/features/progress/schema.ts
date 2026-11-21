import { z } from "zod";

import { architectureSchema } from "@/features/architecture";
import { challengeIdSchema } from "@/features/challenges";

export type AttemptId = string & { readonly __brand: "AttemptId" };

export const attemptIdSchema = z.custom<AttemptId>(
  (value) => typeof value === "string" && value.length > 0,
  { message: "AttemptId must be a non-empty string" },
);

export function asAttemptId(value: string): AttemptId {
  if (value.length === 0) {
    throw new Error("AttemptId cannot be empty");
  }

  return value as AttemptId;
}

export function newAttemptId(): AttemptId {
  return asAttemptId(`attempt_${globalThis.crypto.randomUUID()}`);
}

export const attemptRecordSchema = z.object({
  id: attemptIdSchema,
  challengeId: challengeIdSchema,
  timestamp: z.number().int().nonnegative(),
  maxUsersSustained: z.number().nonnegative(),
  costUsd: z.number().nonnegative(),
  stars: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  sloMet: z.boolean(),
  withinBudget: z.boolean(),
  architecture: architectureSchema,
  failureSummary: z.string().optional(),
});

export type AttemptRecord = z.infer<typeof attemptRecordSchema>;

export const attemptsSchema = z.array(attemptRecordSchema).readonly();

export const MAX_HINTS_PER_CHALLENGE = 3;

export const hintsUnlockedSchema = z.number().int().min(0).max(MAX_HINTS_PER_CHALLENGE);

export const designMapSchema = z.record(challengeIdSchema, architectureSchema);

export const hintsMapSchema = z.record(challengeIdSchema, hintsUnlockedSchema);

export const progressDataSchema = z.object({
  attempts: attemptsSchema,
  designs: designMapSchema,
  hintsUnlocked: hintsMapSchema,
});

export type ProgressData = z.infer<typeof progressDataSchema>;

export const EMPTY_PROGRESS_DATA: ProgressData = {
  attempts: [],
  designs: {},
  hintsUnlocked: {},
};
