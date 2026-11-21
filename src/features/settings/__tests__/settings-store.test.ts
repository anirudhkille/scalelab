import { beforeEach, describe, expect, it } from "vitest";

import { settingsSchema } from "../schema";
import { useSettingsStore } from "../store/app-store";

beforeEach(() => {
  useSettingsStore.getState().restartOnboarding();
});

describe("settings onboarding", () => {
  it("defaults missing onboarding state to incomplete", () => {
    const parsed = settingsSchema.parse({
      theme: "midnight",
      simSpeed: 1,
      reducedMotion: "system",
      particles: true,
    });

    expect(parsed.onboardingComplete).toBe(false);
  });

  it("completes and restarts the onboarding tour", () => {
    expect(useSettingsStore.getState().settings.onboardingComplete).toBe(false);

    useSettingsStore.getState().completeOnboarding();
    expect(useSettingsStore.getState().settings.onboardingComplete).toBe(true);

    useSettingsStore.getState().restartOnboarding();
    expect(useSettingsStore.getState().settings.onboardingComplete).toBe(false);
  });
});
