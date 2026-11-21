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
