import { beforeEach, describe, expect, it } from "vitest";

import { DEFAULT_LOAD_MODIFIERS, type LoadModifiers } from "@/features/challenges";
import {
  MAX_TIMELINE_SAMPLES,
  cacheWarmupTimeSec,
  hotKeyCapacityFactor,
  selectRunTimeline,
  trafficWaveMultiplier,
  useRunStore,
  usersAtTime,
  type RunResult,
  type SimulationStep,
} from "@/features/simulation";

function modifiers(overrides: Partial<LoadModifiers>): LoadModifiers {
  return { ...DEFAULT_LOAD_MODIFIERS, ...overrides };
}

function step(timeSec: number, users: number): SimulationStep {
  return {
    timeSec,
    metrics: {
      users,
      offeredRps: users * 2,
      servedRps: users * 2,
      droppedRps: 0,
      errorRatio: 0,
      averageLatencyMs: 10,
      p95LatencyMs: 20,
      maxUtilizationRatio: 0.5,
      monthlyCostUsd: 100,
    },
    nodes: [],
    edges: [],
  };
}

describe("load modifiers", () => {
  it("applies a sine wave on top of the load profile", () => {
    const wave = { enabled: true, amplitudeRatio: 0.3, periodSec: 40 };
    const profile = [{ durationSec: 10, fromUsers: 100, toUsers: 100 }];

    expect(trafficWaveMultiplier(wave, 10)).toBeCloseTo(1.3);
    expect(usersAtTime(profile, 10, wave)).toBeCloseTo(130);
    expect(usersAtTime(profile, 10)).toBe(100);
  });

  it("reduces effective capacity for the hot-key target only", () => {
    const hotKey = modifiers({
      hotKey: { enabled: true, target: "database", skewRatio: 0.5 },
    });

    expect(hotKeyCapacityFactor(hotKey, "database")).toBeCloseTo(0.725);
    expect(hotKeyCapacityFactor(hotKey, "cache")).toBe(1);
    expect(hotKeyCapacityFactor(DEFAULT_LOAD_MODIFIERS, "database")).toBe(1);
  });

  it("restarts cache warm-up after a simulated flush", () => {
    const flushed = modifiers({ cacheFlushAtSec: 20 });

    expect(cacheWarmupTimeSec(flushed, 10)).toBe(10);
    expect(cacheWarmupTimeSec(flushed, 25)).toBe(5);
    expect(cacheWarmupTimeSec(DEFAULT_LOAD_MODIFIERS, 25)).toBe(25);
  });
});

describe("replay timeline", () => {
  beforeEach(() => {
    useRunStore.getState().resetRun();
  });

  it("samples the timeline and keeps the final frame", () => {
    const store = useRunStore.getState();
    store.beginRun();
    store.receiveStep(step(0, 10));
    store.receiveStep(step(0.2, 20));
    store.receiveStep(step(0.5, 30));

    expect(selectRunTimeline(useRunStore.getState()).map((frame) => frame.timeSec)).toEqual([
      0, 0.5,
    ]);

    const result: RunResult = {
      outcome: { status: "passed", maxUsersSustained: 30, costUsd: 100 },
      finalStep: step(0.5, 40),
      maxUsersSustained: 30,
      monthlyCostUsd: 100,
    };
    useRunStore.getState().completeRun(result);

    const timeline = selectRunTimeline(useRunStore.getState());
    expect(timeline).toHaveLength(2);
    expect(timeline[1]?.metrics.users).toBe(40);
    expect(timeline.length).toBeLessThanOrEqual(MAX_TIMELINE_SAMPLES);
  });

  it("clears the timeline on the next run", () => {
    const store = useRunStore.getState();
    store.beginRun();
    store.receiveStep(step(0, 10));
    expect(selectRunTimeline(useRunStore.getState())).toHaveLength(1);

    useRunStore.getState().resetRun();
    expect(selectRunTimeline(useRunStore.getState())).toEqual([]);
  });
});
