import { toast } from "sonner";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { backupCorruptEntry, safeJSONStorage } from "@/shared/storage";

import {
  MAX_CUSTOM_CHALLENGES,
  customChallengeSchema,
  customChallengesSchema,
  type CustomChallenge,
} from "../custom";

export const CUSTOM_CHALLENGE_STORAGE_KEY = "scalelab:v1:custom-challenges";

type PersistedCustomChallenges = {
  readonly customChallenges: readonly CustomChallenge[];
};

export type CustomChallengeState = {
  readonly customChallenges: readonly CustomChallenge[];
  readonly saveCustomChallenge: (challenge: CustomChallenge) => void;
  readonly removeCustomChallenge: (id: string) => void;
  readonly replaceCustomChallenges: (challenges: readonly CustomChallenge[]) => boolean;
};

export const useCustomChallengeStore = create<CustomChallengeState>()(
  persist(
    (set) => ({
      customChallenges: [],
      saveCustomChallenge: (challenge) => {
        const parsed = customChallengeSchema.safeParse(challenge);

        if (!parsed.success) {
          toast.error("That custom challenge is not valid");
          return;
        }

        set((state) => {
          const others = state.customChallenges.filter((item) => item.id !== parsed.data.id);
          return { customChallenges: [parsed.data, ...others].slice(0, MAX_CUSTOM_CHALLENGES) };
        });
      },
      removeCustomChallenge: (id) => {
        set((state) => ({
          customChallenges: state.customChallenges.filter((challenge) => challenge.id !== id),
        }));
      },
      replaceCustomChallenges: (challenges) => {
        const parsed = customChallengesSchema.safeParse(challenges);

        if (!parsed.success) {
          return false;
        }

        set({ customChallenges: parsed.data });
        return true;
      },
    }),
    {
      name: CUSTOM_CHALLENGE_STORAGE_KEY,
      version: 1,
      storage: safeJSONStorage<PersistedCustomChallenges>(),
      partialize: ({ customChallenges }) => ({ customChallenges }),
      merge: (persisted, current) => {
        const parsed = customChallengesSchema.safeParse(
          (persisted as PersistedCustomChallenges | undefined)?.customChallenges,
        );

        if (!parsed.success) {
          backupCorruptEntry(CUSTOM_CHALLENGE_STORAGE_KEY);
          toast.error("Saved custom challenges were corrupt");
          return current;
        }

        return { ...current, customChallenges: parsed.data };
      },
      migrate: (persisted) => persisted as PersistedCustomChallenges,
    },
  ),
);

export const selectCustomChallenges = (state: CustomChallengeState) => state.customChallenges;
