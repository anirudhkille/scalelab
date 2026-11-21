import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import {
  persistedSettingsSchema,
  type ReducedMotionPreference,
  type Settings,
  type SimSpeed,
  type ThemeId,
} from "../schema";
import { DEFAULT_THEME, STORAGE_KEY, isThemeId } from "../themes";

export type SettingsState = {
  settings: Settings;
  setTheme: (theme: ThemeId) => void;
  setSimSpeed: (speed: SimSpeed) => void;
  setReducedMotion: (preference: ReducedMotionPreference) => void;
  toggleParticles: () => void;
};

type PersistedSettings = {
  settings: Settings;
};

function prefersLightScheme(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: light)").matches
  );
}

export function getInitialTheme(): ThemeId {
  return prefersLightScheme() ? "paper" : DEFAULT_THEME;
}

const initialSettings: Settings = {
  theme: getInitialTheme(),
  simSpeed: 1,
  reducedMotion: "system",
  particles: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    immer((set) => ({
      settings: initialSettings,

      setTheme: (theme) => {
        if (!isThemeId(theme)) return;
        set((state) => {
          state.settings.theme = theme;
        });
      },

      setSimSpeed: (simSpeed) => {
        set((state) => {
          state.settings.simSpeed = simSpeed;
        });
      },

      setReducedMotion: (reducedMotion) => {
        set((state) => {
          state.settings.reducedMotion = reducedMotion;
        });
      },

      toggleParticles: () => {
        set((state) => {
          state.settings.particles = !state.settings.particles;
        });
      },
    })),
    {
      name: STORAGE_KEY,
      version: 1,
      partialize: (state): PersistedSettings => ({ settings: state.settings }),

      // Validate whatever is in localStorage before trusting it. Corrupt or
      // stale slices fall back to defaults instead of crashing hydration.
      merge: (persistedState, currentState) => {
        const parsed = persistedSettingsSchema.safeParse(persistedState);

        return parsed.success ? { ...currentState, settings: parsed.data.settings } : currentState;
      },

      // Future schema changes migrate here. The current shape is v1.
      migrate: (persistedState) => persistedState as PersistedSettings,
    },
  ),
);

export const selectSettings = (state: SettingsState): Settings => state.settings;
