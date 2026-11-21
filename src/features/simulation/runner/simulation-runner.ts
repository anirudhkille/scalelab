/* oxlint-disable unicorn/require-post-message-target-origin -- messages go to a dedicated Worker */
import { formatGraphIssue, type Architecture } from "@/features/architecture";
import type { SimSpeed } from "@/features/settings";

import { createSimulationEngine } from "../engine";
import type { SimulationEngine } from "../engine/types";
import type { RunResult, SimulationConfig, SimulationStep } from "../types";
import { driveTicks } from "./engine-driver";
import type { RunnerInboundMessage, RunnerOutboundMessage } from "./protocol";

const FRAME_INTERVAL_MS = 50;

export type SimulationRunnerCallbacks = {
  readonly onStep: (step: SimulationStep) => void;
  readonly onDone: (result: RunResult) => void;
  readonly onError: (message: string) => void;
  readonly onStopped: () => void;
};

export type SimulationRunner = {
  readonly start: (architecture: Architecture, config: SimulationConfig, speed: SimSpeed) => void;
  readonly setSpeed: (speed: SimSpeed) => void;
  readonly stop: () => void;
  readonly dispose: () => void;
};

export function createSimulationRunner(callbacks: SimulationRunnerCallbacks): SimulationRunner {
  let worker: Worker | null = null;
  let localTimer: ReturnType<typeof setInterval> | null = null;
  let localEngine: SimulationEngine | null = null;
  let localSpeed: SimSpeed = 1;

  function clearLocal(): void {
    if (localTimer !== null) {
      clearInterval(localTimer);
      localTimer = null;
    }
    localEngine = null;
  }

  function dispose(): void {
    worker?.terminate();
    worker = null;
    clearLocal();
  }

  function handleMessage(message: RunnerOutboundMessage): void {
    if (message.type === "step") {
      callbacks.onStep(message.step);
      return;
    }

    if (message.type === "done") {
      callbacks.onDone(message.result);
      dispose();
      return;
    }

    if (message.type === "error") {
      callbacks.onError(message.message);
      dispose();
      return;
    }

    callbacks.onStopped();
    dispose();
  }

  function advanceLocal(): void {
    if (!localEngine) {
      return;
    }

    const driven = driveTicks(localEngine, localSpeed);
    if (driven.step) {
      callbacks.onStep(driven.step);
    }

    if (driven.result) {
      callbacks.onDone(driven.result);
      clearLocal();
    }
  }

  function startLocal(architecture: Architecture, config: SimulationConfig): void {
    const setup = createSimulationEngine(architecture, config);
    if (!setup.ok) {
      callbacks.onError(setup.issues.map(formatGraphIssue).join(" "));
      return;
    }

    localEngine = setup.engine;
    localTimer = setInterval(advanceLocal, FRAME_INTERVAL_MS);
  }

  return {
    start: (architecture, config, speed) => {
      dispose();
      localSpeed = speed;

      if (typeof Worker !== "undefined") {
        try {
          const nextWorker = new Worker(
            new URL("../worker/simulation.worker.ts", import.meta.url),
            { type: "module" },
          );
          nextWorker.addEventListener("message", (event: MessageEvent<RunnerOutboundMessage>) => {
            handleMessage(event.data);
          });
          nextWorker.addEventListener("error", (event) => {
            callbacks.onError(event.message || "The simulation worker failed.");
            dispose();
          });
          worker = nextWorker;
          const message: RunnerInboundMessage = {
            type: "start",
            architecture,
            config,
            speed,
          };
          nextWorker.postMessage(message);
          return;
        } catch {
          worker?.terminate();
          worker = null;
        }
      }

      startLocal(architecture, config);
    },

    setSpeed: (speed) => {
      localSpeed = speed;
      if (worker) {
        const message: RunnerInboundMessage = { type: "speed", speed };
        worker.postMessage(message);
      }
    },

    stop: () => {
      if (worker) {
        const message: RunnerInboundMessage = { type: "stop" };
        worker.postMessage(message);
        return;
      }

      clearLocal();
      callbacks.onStopped();
    },

    dispose,
  };
}
