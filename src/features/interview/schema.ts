import { z } from "zod";

import { challengeIdSchema } from "@/features/challenges";

export const INTERVIEW_DURATION_SEC = 25 * 60;

export const interviewSessionSchema = z.object({
  challengeId: challengeIdSchema,
  startedAt: z.number().int().nonnegative(),
  durationSec: z.number().int().positive(),
  answers: z.record(z.string(), z.string()),
  revealed: z.array(z.string()),
  completedAt: z.number().int().nonnegative().optional(),
});

export type InterviewSession = z.infer<typeof interviewSessionSchema>;

export const interviewStateSchema = z.object({
  sessions: z.record(z.string(), interviewSessionSchema),
});

export type InterviewState = z.infer<typeof interviewStateSchema>;

export const EMPTY_INTERVIEW_STATE: InterviewState = { sessions: {} };
