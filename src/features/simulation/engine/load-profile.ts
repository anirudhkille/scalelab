import type { LoadStage } from "../types";

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * Math.min(1, Math.max(0, t));
}

/** Total simulated seconds described by the load profile. */
export function loadProfileDurationSec(profile: readonly LoadStage[]): number {
  return profile.reduce((total, stage) => total + Math.max(0, stage.durationSec), 0);
}

/**
 * Users at a point in the load profile. Stages are linear ramps; after the
 * final stage the last value holds.
 */
export function usersAtTime(profile: readonly LoadStage[], timeSec: number): number {
  if (profile.length === 0) {
    return 0;
  }

  const first = profile[0];
  if (!first) {
    return 0;
  }

  if (!Number.isFinite(timeSec) || timeSec <= 0) {
    return Math.max(0, first.fromUsers);
  }

  let elapsedSec = 0;

  for (const stage of profile) {
    const durationSec = Math.max(0, stage.durationSec);

    if (timeSec <= elapsedSec + durationSec) {
      const progress = durationSec > 0 ? (timeSec - elapsedSec) / durationSec : 1;
      return Math.max(0, lerp(stage.fromUsers, stage.toUsers, progress));
    }

    elapsedSec += durationSec;
  }

  const last = profile[profile.length - 1];
  return Math.max(0, last?.toUsers ?? 0);
}
