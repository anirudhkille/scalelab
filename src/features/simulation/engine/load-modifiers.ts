import type { LoadModifiers } from "@/features/challenges";

import { HOT_KEY_CAPACITY_PENALTY_RATIO } from "./constants";

export type HotKeyTarget = LoadModifiers["hotKey"]["target"];

/**
 * A hot key concentrates traffic on one shard/key. The model translates that
 * into a capacity penalty on the target component rather than a routing change,
 * so the bottleneck still shows up in utilization and queue depth.
 */
export function hotKeyCapacityFactor(
  modifiers: LoadModifiers | undefined,
  kind: HotKeyTarget,
): number {
  if (!modifiers?.hotKey.enabled || modifiers.hotKey.target !== kind) {
    return 1;
  }

  return 1 - modifiers.hotKey.skewRatio * HOT_KEY_CAPACITY_PENALTY_RATIO;
}

/** Cache warm-up restarts after a simulated flush. */
export function cacheWarmupTimeSec(modifiers: LoadModifiers | undefined, timeSec: number): number {
  const flushAtSec = modifiers?.cacheFlushAtSec;
  if (flushAtSec === undefined || timeSec < flushAtSec) {
    return timeSec;
  }

  return Math.max(0, timeSec - flushAtSec);
}
