import { create } from "zustand";

import type { RunOutcome, RunResult, SimulationStep } from "../types";

export const MAX_CHART_SAMPLES = 240;
export const CHART_SAMPLE_INTERVAL_SEC = 0.5;

export type RunStatus = "idle" | "running" | "passed" | "failed" | "stopped";

export type RunChartSample = {
  readonly timeSec: number;
  readonly users: number;
  readonly offeredRps: number;
  readonly servedRps: number;
  readonly droppedRps: number;
  readonly p95LatencyMs: number;
  readonly errorRatio: number;
  readonly maxUtilizationRatio: number;
};

export type RunState = {
  readonly status: RunStatus;
  readonly step: SimulationStep | null;
  readonly result: RunResult | null;
  readonly outcome: RunOutcome | null;
  readonly history: readonly RunChartSample[];
  readonly error: string | null;
  readonly beginRun: () => void;
  readonly receiveStep: (step: SimulationStep) => void;
  readonly completeRun: (result: RunResult) => void;
  readonly markStopped: () => void;
  readonly failRun: (message: string) => void;
  readonly resetRun: () => void;
};

function sampleFromStep(step: SimulationStep): RunChartSample {
  return {
    timeSec: step.timeSec,
    users: step.metrics.users,
    offeredRps: step.metrics.offeredRps,
    servedRps: step.metrics.servedRps,
    droppedRps: step.metrics.droppedRps,
    p95LatencyMs: step.metrics.p95LatencyMs,
    errorRatio: step.metrics.errorRatio,
    maxUtilizationRatio: step.metrics.maxUtilizationRatio,
  };
}

function withSample(
  history: readonly RunChartSample[],
  step: SimulationStep,
  force: boolean,
): readonly RunChartSample[] {
  const last = history[history.length - 1];

  if (!force && last && step.timeSec - last.timeSec < CHART_SAMPLE_INTERVAL_SEC) {
    return history;
  }

  if (last && step.timeSec === last.timeSec) {
    return history;
  }

  return [...history, sampleFromStep(step)].slice(-MAX_CHART_SAMPLES);
}

const initialState = {
  status: "idle" as const,
  step: null,
  result: null,
  outcome: null,
  history: [] as readonly RunChartSample[],
  error: null,
};

export const useRunStore = create<RunState>()((set, get) => ({
  ...initialState,

  beginRun: () => {
    set({
      status: "running",
      step: null,
      result: null,
      outcome: null,
      history: [],
      error: null,
    });
  },

  receiveStep: (step) => {
    if (get().status !== "running") {
      return;
    }

    set((state) => ({
      step,
      history: withSample(state.history, step, false),
    }));
  },

  completeRun: (result) => {
    set((state) => ({
      status: result.outcome.status,
      result,
      outcome: result.outcome,
      step: result.finalStep,
      history: withSample(state.history, result.finalStep, true),
    }));
  },

  markStopped: () => {
    set({
      status: "stopped",
    });
  },

  failRun: (message) => {
    set({
      status: "failed",
      error: message,
    });
  },

  resetRun: () => {
    set({ ...initialState });
  },
}));

export const selectRunStatus = (state: RunState): RunStatus => state.status;
export const selectRunStep = (state: RunState): SimulationStep | null => state.step;
export const selectRunHistory = (state: RunState): readonly RunChartSample[] => state.history;
export const selectRunOutcome = (state: RunState): RunOutcome | null => state.outcome;
export const selectRunResult = (state: RunState): RunResult | null => state.result;
export const selectRunError = (state: RunState): string | null => state.error;
export const selectIsRunning = (state: RunState): boolean => state.status === "running";
