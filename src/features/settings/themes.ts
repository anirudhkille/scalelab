import {
  reducedMotionPreferenceSchema,
  simSpeedSchema,
  themeIdSchema,
  type ReducedMotionPreference,
  type SimSpeed,
  type ThemeId,
} from "./schema";

export type ThemeDefinition = {
  id: ThemeId;
  label: string;
  description: string;
  dark: boolean;
};

export const THEMES = [
  {
    id: "midnight",
    label: "Midnight",
    description: "Near-black slate with an electric cyan accent.",
    dark: true,
  },
  {
    id: "violet",
    label: "Violet",
    description: "Deep indigo with a violet accent.",
    dark: true,
  },
  {
    id: "terminal",
    label: "Terminal",
    description: "Phosphor green console on near-black.",
    dark: true,
  },
  {
    id: "paper",
    label: "Paper",
    description: "Light, high-contrast daylight theme.",
    dark: false,
  },
] as const satisfies readonly ThemeDefinition[];

export const DEFAULT_THEME: ThemeId = "midnight";

export const STORAGE_KEY = "scalelab:v1";

export function isThemeId(value: unknown): value is ThemeId {
  return themeIdSchema.safeParse(value).success;
}

export function isSimSpeed(value: unknown): value is SimSpeed {
  return simSpeedSchema.safeParse(value).success;
}

export function isReducedMotionPreference(value: unknown): value is ReducedMotionPreference {
  return reducedMotionPreferenceSchema.safeParse(value).success;
}
