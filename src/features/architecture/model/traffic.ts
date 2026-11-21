import type { TrafficClass, TrafficRate } from "./types";

export const TRAFFIC_CLASSES = ["read", "write", "static"] as const;

export const ZERO_TRAFFIC: TrafficRate = {
  read: 0,
  write: 0,
  static: 0,
};

export function clampRatio(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

export function trafficTotal(rate: TrafficRate): number {
  return rate.read + rate.write + rate.static;
}

export function addTraffic(left: TrafficRate, right: TrafficRate): TrafficRate {
  return {
    read: left.read + right.read,
    write: left.write + right.write,
    static: left.static + right.static,
  };
}

export function scaleTraffic(rate: TrafficRate, factor: number): TrafficRate {
  if (!Number.isFinite(factor) || factor <= 0) {
    return ZERO_TRAFFIC;
  }

  return {
    read: rate.read * factor,
    write: rate.write * factor,
    static: rate.static * factor,
  };
}

export function trafficForClass(rate: TrafficRate, trafficClass: TrafficClass): number {
  return rate[trafficClass];
}

/**
 * Split a total request rate into the three traffic classes.
 *
 * `staticRatio` applies to all requests; the remaining dynamic traffic is split
 * by `readRatio`. Ratios are clamped to 0..1 so a malformed challenge cannot
 * produce negative traffic.
 */
export function trafficFromLoad(
  users: number,
  requestsPerUserPerSec: number,
  readRatio: number,
  staticRatio: number,
): TrafficRate {
  const totalRps = Math.max(0, users) * Math.max(0, requestsPerUserPerSec);
  const safeStaticRatio = clampRatio(staticRatio);
  const safeReadRatio = clampRatio(readRatio);
  const staticRps = totalRps * safeStaticRatio;
  const dynamicRps = totalRps * (1 - safeStaticRatio);

  return {
    read: dynamicRps * safeReadRatio,
    write: dynamicRps * (1 - safeReadRatio),
    static: staticRps,
  };
}

/** Total request rate that a load profile produces at a point in time. */
export function offeredRpsAtLoad(
  users: number,
  requestsPerUserPerSec: number,
  readRatio: number,
  staticRatio: number,
): number {
  return trafficTotal(trafficFromLoad(users, requestsPerUserPerSec, readRatio, staticRatio));
}
