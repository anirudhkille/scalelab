import { describe, expect, it } from "vitest";

import {
  asNodeId,
  defaultComponentParams,
  type Architecture,
  type NodeKind,
} from "@/features/architecture";

import { costBreakdownByComponent, designDiff } from "../design-comparison";

function architecture(kinds: readonly NodeKind[]): Architecture {
  return {
    schemaVersion: 1,
    nodes: kinds.map((kind, index) => ({
      id: asNodeId(`node-${index}`),
      label: kind,
      position: { x: index * 100, y: 0 },
      region: "us-east",
      zone: "a",
      params: defaultComponentParams(kind),
    })),
    edges: [],
  };
}

describe("design comparison", () => {
  it("groups monthly cost by component and sorts the expensive lines first", () => {
    const breakdown = costBreakdownByComponent(
      architecture(["appServer", "appServer", "database", "cache"]),
    );

    expect(breakdown.totalUsd).toBeGreaterThan(0);
    expect(breakdown.lines[0]?.monthlyCostUsd).toBeGreaterThanOrEqual(
      breakdown.lines[1]?.monthlyCostUsd ?? 0,
    );
    expect(breakdown.lines.map((line) => line.kind)).toEqual(
      expect.arrayContaining(["appServer", "database", "cache"]),
    );
  });

  it("reports added, skipped, and cost delta against the reference", () => {
    const user = architecture(["appServer", "appServer", "cache"]);
    const reference = architecture(["appServer", "database"]);
    const diff = designDiff(user, reference);

    expect(diff.added).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "appServer", count: 1 }),
        expect.objectContaining({ kind: "cache", count: 1 }),
      ]),
    );
    expect(diff.skipped).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "database", count: 1 })]),
    );
    expect(diff.deltaRatio).toBeGreaterThan(0);
    expect(diff.userTotalUsd).toBeGreaterThan(diff.referenceTotalUsd);
  });
});
