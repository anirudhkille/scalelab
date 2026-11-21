import type { SimSpeed } from "@/features/settings";

import type { SimulationEngine } from "../engine/types";
import type { RunResult, SimulationStep } from "../types";

export type DrivenTicks = {
  readonly step: SimulationStep | null;
  readonly result: RunResult | null;
};

/**
 * Advance an engine by one worker frame. At 10x speed a 50 ms frame advances
 * one simulated second, which keeps playback responsive without overwhelming
 * the main thread.
 */
export function driveTicks(engine: SimulationEngine, speed: SimSpeed): DrivenTicks {
  const ticks = Math.max(1, Math.round(speed));
  let step: SimulationStep | null = null;

  for (let index = 0; index < ticks; index += 1) {
    const next = engine.step();
    if (next) {
      step = next;
    }

    if (!next || engine.outcome) {
      break;
    }
  }

  return {
    step,
    result: engine.outcome ? engine.run() : null,
  };
}
