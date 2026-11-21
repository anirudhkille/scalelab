import { useCallback, useEffect, useRef } from "react";

import type { Architecture } from "@/features/architecture";
import type { SimSpeed } from "@/features/settings";

import { createSimulationRunner, type SimulationRunner } from "../runner/simulation-runner";
import { useRunStore } from "../store/run-store";
import type { SimulationConfig } from "../types";

export type RunSimulationControls = {
  readonly startRun: (
    architecture: Architecture,
    config: SimulationConfig,
    speed: SimSpeed,
  ) => void;
  readonly stopRun: () => void;
  readonly setRunSpeed: (speed: SimSpeed) => void;
};

export function useRunSimulation(): RunSimulationControls {
  const runnerRef = useRef<SimulationRunner | null>(null);
  const beginRun = useRunStore((state) => state.beginRun);
  const receiveStep = useRunStore((state) => state.receiveStep);
  const completeRun = useRunStore((state) => state.completeRun);
  const markStopped = useRunStore((state) => state.markStopped);
  const failRun = useRunStore((state) => state.failRun);

  const getRunner = useCallback((): SimulationRunner => {
    if (!runnerRef.current) {
      runnerRef.current = createSimulationRunner({
        onStep: receiveStep,
        onDone: completeRun,
        onError: failRun,
        onStopped: markStopped,
      });
    }

    return runnerRef.current;
  }, [completeRun, failRun, markStopped, receiveStep]);

  useEffect(() => {
    return () => {
      runnerRef.current?.dispose();
      runnerRef.current = null;
    };
  }, []);

  const startRun = useCallback(
    (architecture: Architecture, config: SimulationConfig, speed: SimSpeed) => {
      beginRun();
      getRunner().start(architecture, config, speed);
    },
    [beginRun, getRunner],
  );

  const stopRun = useCallback(() => {
    runnerRef.current?.stop();
  }, []);

  const setRunSpeed = useCallback((speed: SimSpeed) => {
    runnerRef.current?.setSpeed(speed);
  }, []);

  return { startRun, stopRun, setRunSpeed };
}
