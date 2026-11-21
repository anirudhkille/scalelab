import { create } from "zustand";

import type { AttemptRecord } from "../schema";
import type { AttemptStars } from "../scoring";

export const MAX_ATTEMPTS_PER_CHALLENGE = 20;

export type AttemptState = {
  readonly attempts: readonly AttemptRecord[];
  readonly addAttempt: (attempt: AttemptRecord) => void;
  readonly clearAttempts: () => void;
};

export const useAttemptStore = create<AttemptState>()((set) => ({
  attempts: [],

  addAttempt: (attempt) => {
    set((state) => {
      const others = state.attempts.filter(
        (candidate) => candidate.challengeId !== attempt.challengeId,
      );
      const forChallenge = state.attempts.filter(
        (candidate) => candidate.challengeId === attempt.challengeId,
      );

      const nextForChallenge = [attempt, ...forChallenge]
        .toSorted((left, right) => right.timestamp - left.timestamp)
        .slice(0, MAX_ATTEMPTS_PER_CHALLENGE);

      return {
        attempts: [...nextForChallenge, ...others].toSorted(
          (left, right) => right.timestamp - left.timestamp,
        ),
      };
    });
  },

  clearAttempts: () => {
    set({ attempts: [] });
  },
}));

export const selectAttempts = (state: AttemptState): readonly AttemptRecord[] => state.attempts;
export const selectAttemptCount = (state: AttemptState): number => state.attempts.length;

export function selectAttemptsForChallenge(
  challengeId: AttemptRecord["challengeId"],
): (state: AttemptState) => readonly AttemptRecord[] {
  return (state) => state.attempts.filter((attempt) => attempt.challengeId === challengeId);
}

export function bestStarsForChallenge(attempts: readonly AttemptRecord[]): AttemptStars {
  return attempts.reduce<AttemptStars>(
    (best, attempt) => (attempt.stars > best ? attempt.stars : best),
    0,
  );
}
