import { z } from "zod";

import {
  NODE_KINDS,
  REGION_IDS,
  ZONE_IDS,
  architectureSchema,
  nodeIdSchema,
  ratioSchema,
} from "@/features/architecture";
import { challengePackSchema } from "./packs";

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

export const failureEventSchema = z
  .object({
    atSec: z.number().nonnegative(),
    kind: z.enum(["killNode", "slowNode", "azOutage"]),
    durationSec: z.number().positive().default(15),
    nodeId: nodeIdSchema.optional(),
    region: z.enum(REGION_IDS).optional(),
    zone: z.enum(ZONE_IDS).optional(),
    severityRatio: ratioSchema.optional(),
  })
  .superRefine((event, context) => {
    if (event.kind === "killNode" || event.kind === "slowNode") {
      if (event.nodeId === undefined) {
        context.addIssue({
          code: "custom",
          message: "Node failures require a target nodeId.",
          path: ["nodeId"],
        });
      }

      return;
    }

    if (event.region === undefined) {
      context.addIssue({
        code: "custom",
        message: "An AZ outage requires a target region.",
        path: ["region"],
      });
    }

    if (event.zone === undefined) {
      context.addIssue({
        code: "custom",
        message: "An AZ outage requires a target zone.",
        path: ["zone"],
      });
    }
  });

export type FailureEvent = z.infer<typeof failureEventSchema>;

export const loadModifiersSchema = z.object({
  retryStorm: z.object({
    enabled: z.boolean(),
    maxAttempts: z.number().int().min(1).max(10),
  }),
  trafficWave: z.object({
    enabled: z.boolean(),
    amplitudeRatio: ratioSchema,
    periodSec: z.number().positive(),
  }),
  hotKey: z.object({
    enabled: z.boolean(),
    target: z.enum(["cache", "database", "searchIndex"]),
    skewRatio: ratioSchema,
  }),
  /** Simulated second at which the cache is flushed, if any. */
  cacheFlushAtSec: z.number().nonnegative().optional(),
});

export type LoadModifiers = z.infer<typeof loadModifiersSchema>;

export const DEFAULT_LOAD_MODIFIERS: LoadModifiers = {
  retryStorm: { enabled: false, maxAttempts: 3 },
  trafficWave: { enabled: false, amplitudeRatio: 0.35, periodSec: 40 },
  hotKey: { enabled: false, target: "cache", skewRatio: 0.6 },
};

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

/** The challenge data needed by a run, without depending on the simulation feature. */
export type ChallengeRunConfig = {
  readonly requirements: ChallengeRequirements;
  readonly loadProfile: readonly LoadStage[];
  readonly failureScenarios?: readonly FailureEvent[];
  readonly loadModifiers?: LoadModifiers;
};

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
  pack: challengePackSchema.default("fundamentals"),
  concepts: z.array(z.string()),
  briefMd: z.string(),
  requirements: challengeRequirementsSchema,
  loadProfile: z.array(loadStageSchema),
  failureScenarios: z.array(failureEventSchema).optional(),
  loadModifiers: loadModifiersSchema.optional(),
  allowedComponents: z.array(z.enum(NODE_KINDS)),
  starterArchitecture: architectureSchema.optional(),
  referenceSolution: architectureSchema.optional(),
  hints: z.array(z.string()),
  learningGoals: z.array(z.string()),
});

export type Challenge = z.infer<typeof challengeSchema>;
