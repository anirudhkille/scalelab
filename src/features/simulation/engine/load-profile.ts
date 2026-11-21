import type { LoadModifiers } from "@/features/challenges";

import type { LoadStage } from "../types";

type TrafficWave = LoadModifiers["trafficWave"];

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * Math.min(1, Math.max(0, t));
}

/** Total simulated seconds described by the load profile. */
export function loadProfileDurationSec(profile: readonly LoadStage[]): number {
  return profile.reduce((total, stage) => total + Math.max(0, stage.durationSec), 0);
}

/** Daily sine wave multiplier used by the "traffic wave" load modifier. */
export function trafficWaveMultiplier(wave: TrafficWave | undefined, timeSec: number): number {
  if (!wave?.enabled || wave.periodSec <= 0) {
    return 1;
  }

  const phase = (2 * Math.PI * Math.max(0, timeSec)) / wave.periodSec;
  return Math.max(0, 1 + wave.amplitudeRatio * Math.sin(phase));
}

/**
 * Users at a point in the load profile. Stages are linear ramps; after the
 * final stage the last value holds. An optional wave modulates the whole
 * profile so a steady hold becomes a daily peak-and-trough pattern.
 */
export function usersAtTime(
  profile: readonly LoadStage[],
  timeSec: number,
  wave?: TrafficWave,
): number {
  if (profile.length === 0) {
    return 0;
  }

  const first = profile[0];
  if (!first) {
    return 0;
  }

  const multiplier = trafficWaveMultiplier(wave, timeSec);

  if (!Number.isFinite(timeSec) || timeSec <= 0) {
    return Math.max(0, first.fromUsers * multiplier);
  }

  let elapsedSec = 0;

  for (const stage of profile) {
    const durationSec = Math.max(0, stage.durationSec);

    if (timeSec <= elapsedSec + durationSec) {
      const progress = durationSec > 0 ? (timeSec - elapsedSec) / durationSec : 1;
      return Math.max(0, lerp(stage.fromUsers, stage.toUsers, progress) * multiplier);
    }

    elapsedSec += durationSec;
  }

  const last = profile[profile.length - 1];
  return Math.max(0, (last?.toUsers ?? 0) * multiplier);
}
