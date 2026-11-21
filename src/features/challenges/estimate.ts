export const ESTIMATOR_ASSUMPTIONS = {
  secondsPerDay: 86_400,
  daysPerYear: 365,
  peakToAverageRatio: 3,
  responseSizeKb: 2,
  recordSizeKb: 1,
} as const;

export type EstimatorInput = {
  readonly users: number;
  readonly requestsPerUserPerSec: number;
  readonly peakToAverageRatio: number;
  readonly readRatio: number;
  readonly responseSizeKb: number;
  readonly recordSizeKb: number;
};

export type EstimatorResult = {
  readonly averageQps: number;
  readonly peakQps: number;
  readonly readQps: number;
  readonly writeQps: number;
  readonly dailyRequests: number;
  readonly dailyWriteGb: number;
  readonly annualStorageGb: number;
  readonly averageBandwidthMbps: number;
  readonly peakBandwidthMbps: number;
};

function nonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function ratio(value: number): number {
  return Math.min(1, nonNegative(value));
}

/** Pure back-of-envelope math so the panel and tests share one source of truth. */
export function estimateLoad(input: EstimatorInput): EstimatorResult {
  const users = nonNegative(input.users);
  const requestsPerUserPerSec = nonNegative(input.requestsPerUserPerSec);
  const peakToAverageRatio = Math.max(1, nonNegative(input.peakToAverageRatio));
  const readRatio = ratio(input.readRatio);
  const responseSizeKb = nonNegative(input.responseSizeKb);
  const recordSizeKb = nonNegative(input.recordSizeKb);

  const averageQps = users * requestsPerUserPerSec;
  const peakQps = averageQps * peakToAverageRatio;
  const readQps = averageQps * readRatio;
  const writeQps = averageQps * (1 - readRatio);
  const dailyRequests = averageQps * ESTIMATOR_ASSUMPTIONS.secondsPerDay;
  const dailyWriteGb = (dailyRequests * (1 - readRatio) * recordSizeKb) / (1024 * 1024);
  const annualStorageGb = dailyWriteGb * ESTIMATOR_ASSUMPTIONS.daysPerYear;
  const averageBandwidthMbps = (averageQps * responseSizeKb * 8) / 1024;

  return {
    averageQps,
    peakQps,
    readQps,
    writeQps,
    dailyRequests,
    dailyWriteGb,
    annualStorageGb,
    averageBandwidthMbps,
    peakBandwidthMbps: averageBandwidthMbps * peakToAverageRatio,
  };
}
