/* oxlint-disable unicorn/require-post-message-target-origin -- dedicated worker scope has no origin */
import type { SimSpeed } from "@/features/settings";

import { createSimulationEngine } from "../engine";
import type { SimulationEngine } from "../engine/types";
import { driveTicks } from "../runner/engine-driver";
import type {
  RunnerInboundMessage,
  RunnerOutboundMessage,
  RunnerStartMessage,
} from "../runner/protocol";

const FRAME_INTERVAL_MS = 50;

type WorkerScope = {
  addEventListener: (
    type: "message",
    listener: (event: MessageEvent<RunnerInboundMessage>) => void,
  ) => void;
  postMessage: (message: RunnerOutboundMessage) => void;
};

const scope = self as unknown as WorkerScope;

let engine: SimulationEngine | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let speed: SimSpeed = 1;

function post(message: RunnerOutboundMessage): void {
  scope.postMessage(message);
}

function clearTimer(): void {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function stop(): void {
  clearTimer();
  engine = null;
}

function advance(): void {
  if (!engine) {
    return;
  }

  const driven = driveTicks(engine, speed);
  if (driven.step) {
    post({ type: "step", step: driven.step });
  }

  if (driven.result) {
    post({ type: "done", result: driven.result });
    stop();
    return;
  }

  if (!driven.step) {
    post({ type: "error", message: "The simulation stalled before producing a result." });
    stop();
  }
}

function start(message: RunnerStartMessage): void {
  stop();
  speed = message.speed;

  const setup = createSimulationEngine(message.architecture, message.config);
  if (!setup.ok) {
    const count = setup.issues.length;
    post({
      type: "error",
      message: `The design is invalid (${count} ${count === 1 ? "issue" : "issues"}). Fix the graph and try again.`,
    });
    return;
  }

  engine = setup.engine;
  timer = setInterval(advance, FRAME_INTERVAL_MS);
}

scope.addEventListener("message", (event) => {
  const message = event.data;

  if (message.type === "start") {
    start(message);
    return;
  }

  if (message.type === "speed") {
    speed = message.speed;
    return;
  }

  stop();
  post({ type: "stopped" });
});
