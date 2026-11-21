import { beforeEach, describe, expect, it } from "vitest";

import {
  MAX_CHART_SAMPLES,
  useRunStore,
  type RunResult,
  type SimulationStep,
} from "@/features/simulation";

function stepAt(timeSec: number): SimulationStep {
  return {
    timeSec,
    nodes: [],
    edges: [],
    metrics: {
      users: timeSec * 10,
      offeredRps: timeSec * 20,
      servedRps: timeSec * 18,
      droppedRps: timeSec * 2,
      errorRatio: 0.01,
      averageLatencyMs: 40,
      p95LatencyMs: 80,
      maxUtilizationRatio: 0.6,
      monthlyCostUsd: 120,
    },
  };
}

function passedResult(finalStep: SimulationStep): RunResult {
  return {
    outcome: {
      status: "passed",
      maxUsersSustained: finalStep.metrics.users,
      costUsd: finalStep.metrics.monthlyCostUsd,
    },
    finalStep,
    maxUsersSustained: finalStep.metrics.users,
    monthlyCostUsd: finalStep.metrics.monthlyCostUsd,
  };
}

beforeEach(() => {
  useRunStore.getState().resetRun();
});

describe("useRunStore", () => {
  it("resets and begins a clean run", () => {
    const store = useRunStore.getState();

    store.beginRun();
    store.receiveStep(stepAt(0));
    store.completeRun(passedResult(stepAt(0.5)));

    store.resetRun();
    expect(useRunStore.getState().status).toBe("idle");
    expect(useRunStore.getState().step).toBeNull();
    expect(useRunStore.getState().history).toHaveLength(0);

    store.beginRun();
    expect(useRunStore.getState().status).toBe("running");
    expect(useRunStore.getState().result).toBeNull();
    expect(useRunStore.getState().outcome).toBeNull();
    expect(useRunStore.getState().error).toBeNull();
  });

  it("throttles chart samples to one every half second", () => {
    const store = useRunStore.getState();
    store.beginRun();

    store.receiveStep(stepAt(0));
    store.receiveStep(stepAt(0.1));
    store.receiveStep(stepAt(0.4));
    expect(useRunStore.getState().history).toHaveLength(1);

    store.receiveStep(stepAt(0.5));
    store.receiveStep(stepAt(0.5));
    expect(useRunStore.getState().history).toHaveLength(2);
    expect(useRunStore.getState().history[1]?.timeSec).toBe(0.5);
  });

  it("caps the chart history at the configured maximum", () => {
    const store = useRunStore.getState();
    store.beginRun();

    for (let index = 0; index < 300; index += 1) {
      store.receiveStep(stepAt(index * 0.5));
    }

    const history = useRunStore.getState().history;
    expect(history).toHaveLength(MAX_CHART_SAMPLES);
    expect(history[0]?.timeSec).toBe((300 - MAX_CHART_SAMPLES) * 0.5);
    expect(history[history.length - 1]?.timeSec).toBe(149.5);
  });

  it("completes with the terminal result and final sample", () => {
    const store = useRunStore.getState();
    store.beginRun();
    store.receiveStep(stepAt(0));

    const finalStep = stepAt(0.5);
    const result = passedResult(finalStep);
    store.completeRun(result);

    const state = useRunStore.getState();
    expect(state.status).toBe("passed");
    expect(state.result).toBe(result);
    expect(state.outcome).toBe(result.outcome);
    expect(state.step).toBe(finalStep);
    expect(state.history).toHaveLength(2);
    expect(state.history[1]?.timeSec).toBe(0.5);
  });

  it("records stopped and failed runs", () => {
    const store = useRunStore.getState();
    store.beginRun();
    store.markStopped();
    expect(useRunStore.getState().status).toBe("stopped");

    store.beginRun();
    store.failRun("worker failed");
    expect(useRunStore.getState().status).toBe("failed");
    expect(useRunStore.getState().error).toBe("worker failed");
  });

  it("ignores steps when a run is not active", () => {
    useRunStore.getState().receiveStep(stepAt(1));

    expect(useRunStore.getState().step).toBeNull();
    expect(useRunStore.getState().history).toHaveLength(0);
  });
});
