import { z } from "zod";

export const THEME_IDS = ["midnight", "violet", "terminal", "paper"] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const themeIdSchema = z.enum(THEME_IDS);

export const SIM_SPEEDS = [1, 2, 5, 10] as const;

export type SimSpeed = (typeof SIM_SPEEDS)[number];

export const simSpeedSchema = z.union([z.literal(1), z.literal(2), z.literal(5), z.literal(10)]);

export const REDUCED_MOTION_PREFERENCES = ["system", "on", "off"] as const;

export type ReducedMotionPreference = (typeof REDUCED_MOTION_PREFERENCES)[number];

export const reducedMotionPreferenceSchema = z.enum(REDUCED_MOTION_PREFERENCES);

export const settingsSchema = z.object({
  theme: themeIdSchema,
  simSpeed: simSpeedSchema,
  reducedMotion: reducedMotionPreferenceSchema,
  particles: z.boolean(),
});

export type Settings = z.infer<typeof settingsSchema>;

export const persistedSettingsSchema = z.object({
  settings: settingsSchema,
});
