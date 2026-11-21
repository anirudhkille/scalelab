import { describe, expect, it } from "vitest";

import { estimateLoad } from "../estimate";

describe("back-of-envelope estimator", () => {
  it("turns users and request rate into QPS, storage, and bandwidth", () => {
    const result = estimateLoad({
      users: 100,
      requestsPerUserPerSec: 2,
      peakToAverageRatio: 3,
      readRatio: 0.75,
      responseSizeKb: 2,
      recordSizeKb: 1,
    });

    expect(result.averageQps).toBe(200);
    expect(result.peakQps).toBe(600);
    expect(result.readQps).toBe(150);
    expect(result.writeQps).toBe(50);
    expect(result.dailyRequests).toBe(17_280_000);
    expect(result.dailyWriteGb).toBeCloseTo(4.12, 2);
    expect(result.annualStorageGb).toBeCloseTo(1_503.75, 1);
    expect(result.averageBandwidthMbps).toBe(3.125);
    expect(result.peakBandwidthMbps).toBe(9.375);
  });

  it("clamps invalid inputs instead of producing negative capacity", () => {
    const result = estimateLoad({
      users: -10,
      requestsPerUserPerSec: -1,
      peakToAverageRatio: 0,
      readRatio: 4,
      responseSizeKb: -2,
      recordSizeKb: -1,
    });

    expect(result.averageQps).toBe(0);
    expect(result.peakQps).toBe(0);
    expect(result.readQps).toBe(0);
    expect(result.writeQps).toBe(0);
    expect(result.annualStorageGb).toBe(0);
  });
});
