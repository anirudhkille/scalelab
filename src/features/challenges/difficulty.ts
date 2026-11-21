import type { Challenge } from "./schema";

export const CHALLENGE_DIFFICULTY_LABELS = {
  1: "Warm-up",
  2: "Read-heavy",
  3: "Media scale",
  4: "Bursty writes",
  5: "Flash load",
} as const satisfies Record<Challenge["difficulty"], string>;

export type ChallengeDifficulty = Challenge["difficulty"];

export function difficultyLabel(difficulty: ChallengeDifficulty): string {
  return CHALLENGE_DIFFICULTY_LABELS[difficulty];
}
