import { z } from "zod";

export const CHALLENGE_PACKS = ["fundamentals", "scale", "consistency", "resilience"] as const;

export const challengePackSchema = z.enum(CHALLENGE_PACKS);

export type ChallengePack = z.infer<typeof challengePackSchema>;

export const CHALLENGE_PACK_META = {
  fundamentals: {
    label: "Fundamentals",
    description: "Static delivery, caching, and the first tier that cannot keep up.",
  },
  scale: {
    label: "Scale & fan-out",
    description: "Read-heavy feeds, media, timelines, and one write becoming many.",
  },
  consistency: {
    label: "Consistency",
    description: "Money, chat, and inventory where stale or lost data is a correctness bug.",
  },
  resilience: {
    label: "Resilience & reach",
    description: "Bursts, abuse, and serving users from more than one region.",
  },
} as const satisfies Record<
  ChallengePack,
  { readonly label: string; readonly description: string }
>;

export function packLabel(pack: ChallengePack): string {
  return CHALLENGE_PACK_META[pack].label;
}
