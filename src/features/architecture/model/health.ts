export type NodeHealth = {
  readonly utilizationRatio: number;
  readonly queueDepth: number;
  readonly servedRps: number;
  readonly droppedRps: number;
  readonly latencyMs: number;
};

export type NodeHealthLevel = "idle" | "ok" | "warm" | "hot" | "fail";

export function healthLevel(health: NodeHealth | undefined): NodeHealthLevel {
  if (!health) {
    return "idle";
  }

  if (health.droppedRps > 0 || health.utilizationRatio >= 0.98) {
    return "fail";
  }

  if (health.utilizationRatio >= 0.9) {
    return "hot";
  }

  if (health.utilizationRatio >= 0.7) {
    return "warm";
  }

  return "ok";
}

export function queuePressureRatio(queueDepth: number): number {
  if (queueDepth <= 0) {
    return 0;
  }

  return Math.min(1, 1 - Math.exp(-queueDepth / 120));
}
