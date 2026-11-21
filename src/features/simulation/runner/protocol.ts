import type { Architecture } from "@/features/architecture";
import type { SimSpeed } from "@/features/settings";

import type { RunResult, SimulationConfig, SimulationStep } from "../types";

export type RunnerStartMessage = {
  readonly type: "start";
  readonly architecture: Architecture;
  readonly config: SimulationConfig;
  readonly speed: SimSpeed;
};

export type RunnerSpeedMessage = {
  readonly type: "speed";
  readonly speed: SimSpeed;
};

export type RunnerStopMessage = {
  readonly type: "stop";
};

export type RunnerInboundMessage = RunnerStartMessage | RunnerSpeedMessage | RunnerStopMessage;

export type RunnerStepMessage = {
  readonly type: "step";
  readonly step: SimulationStep;
};

export type RunnerDoneMessage = {
  readonly type: "done";
  readonly result: RunResult;
};

export type RunnerErrorMessage = {
  readonly type: "error";
  readonly message: string;
};

export type RunnerStoppedMessage = {
  readonly type: "stopped";
};

export type RunnerOutboundMessage =
  RunnerStepMessage | RunnerDoneMessage | RunnerErrorMessage | RunnerStoppedMessage;
