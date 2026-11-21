import { toast } from "sonner";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { Architecture } from "@/features/architecture";
import type { ChallengeId } from "@/features/challenges";
import { backupCorruptEntry, safeJSONStorage } from "@/shared/storage";

import {
  EMPTY_PROGRESS_DATA,
  MAX_HINTS_PER_CHALLENGE,
  progressDataSchema,
  type AttemptRecord,
  type ProgressData,
} from "../schema";
import type { AttemptStars } from "../scoring";

export const MAX_ATTEMPTS_PER_CHALLENGE = 20;
export const PROGRESS_STORAGE_KEY = "scalelab:v1:progress";

export type ProgressActions = {
  readonly addAttempt: (attempt: AttemptRecord) => void;
  readonly saveDesign: (challengeId: ChallengeId, architecture: Architecture) => void;
  readonly setHintsUnlocked: (challengeId: ChallengeId, count: number) => void;
  readonly replaceProgress: (data: ProgressData) => void;
  readonly resetProgress: () => void;
};

export type ProgressState = ProgressData & ProgressActions;

function clampHintCount(count: number): number {
  if (!Number.isFinite(count)) {
    return 0;
  }

  return Math.min(MAX_HINTS_PER_CHALLENGE, Math.max(0, Math.round(count)));
}

function addAttemptToData(
  data: Pick<ProgressData, "attempts">,
  attempt: AttemptRecord,
): readonly AttemptRecord[] {
  const others = data.attempts.filter((candidate) => candidate.challengeId !== attempt.challengeId);
  const forChallenge = data.attempts.filter(
    (candidate) => candidate.challengeId === attempt.challengeId,
  );

  const nextForChallenge = [attempt, ...forChallenge]
    .toSorted((left, right) => right.timestamp - left.timestamp)
    .slice(0, MAX_ATTEMPTS_PER_CHALLENGE);

  return [...nextForChallenge, ...others].toSorted(
    (left, right) => right.timestamp - left.timestamp,
  );
}

export const useAttemptStore = create<ProgressState>()(
  persist(
    (set) => ({
      ...EMPTY_PROGRESS_DATA,

      addAttempt: (attempt) => {
        set((state) => ({ attempts: addAttemptToData(state, attempt) }));
      },

      saveDesign: (challengeId, architecture) => {
        set((state) => ({
          designs: { ...state.designs, [challengeId]: architecture },
        }));
      },

      setHintsUnlocked: (challengeId, count) => {
        set((state) => ({
          hintsUnlocked: {
            ...state.hintsUnlocked,
            [challengeId]: clampHintCount(count),
          },
        }));
      },

      replaceProgress: (data) => {
        const parsed = progressDataSchema.safeParse(data);

        if (!parsed.success) {
          return;
        }

        set(parsed.data);
      },

      resetProgress: () => {
        set(EMPTY_PROGRESS_DATA);
      },
    }),
    {
      name: PROGRESS_STORAGE_KEY,
      version: 1,
      storage: safeJSONStorage<ProgressData>(),
      partialize: (state): ProgressData => ({
        attempts: state.attempts,
        designs: state.designs,
        hintsUnlocked: state.hintsUnlocked,
      }),

      merge: (persistedState, currentState) => {
        const parsed = progressDataSchema.safeParse(persistedState);

        if (parsed.success) {
          return { ...currentState, ...parsed.data };
        }

        if (backupCorruptEntry(PROGRESS_STORAGE_KEY)) {
          toast.error("Saved progress was corrupt", {
            description: "A backup was kept and ScaleLab started a fresh progress file.",
          });
        }

        return currentState;
      },

      migrate: (persistedState) => persistedState as ProgressData,
    },
  ),
);

export const selectAttempts = (state: ProgressState): readonly AttemptRecord[] => state.attempts;

export const selectAttemptCount = (state: ProgressState): number => state.attempts.length;

export function selectAttemptsForChallenge(
  challengeId: ChallengeId,
): (state: ProgressState) => readonly AttemptRecord[] {
  return (state) => state.attempts.filter((attempt) => attempt.challengeId === challengeId);
}

export function selectDesign(
  challengeId: ChallengeId,
): (state: ProgressState) => Architecture | undefined {
  return (state) => state.designs[challengeId];
}

export function selectHintsUnlocked(challengeId: ChallengeId): (state: ProgressState) => number {
  return (state) => state.hintsUnlocked[challengeId] ?? 0;
}

export function selectProgressData(state: ProgressState): ProgressData {
  return {
    attempts: state.attempts,
    designs: state.designs,
    hintsUnlocked: state.hintsUnlocked,
  };
}

export function bestStarsForChallenge(attempts: readonly AttemptRecord[]): AttemptStars {
  return attempts.reduce<AttemptStars>(
    (best, attempt) => (attempt.stars > best ? attempt.stars : best),
    0,
  );
}
