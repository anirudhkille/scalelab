import { describe, expect, it } from "vitest";

import { asChallengeId } from "@/features/challenges";
import type { Settings } from "@/features/settings";

import { buildExport, exportFileName, parseExport, serializeExport } from "../data-transfer";
import { EMPTY_PROGRESS_DATA, newAttemptId, type ProgressData } from "../schema";

const SETTINGS: Settings = {
  theme: "midnight",
  simSpeed: 1,
  reducedMotion: "system",
  particles: true,
  onboardingComplete: true,
};

describe("progress export/import", () => {
  it("round-trips a valid export", () => {
    const data = buildExport(SETTINGS, EMPTY_PROGRESS_DATA, 1_700_000_000_000);
    const parsed = parseExport(serializeExport(data));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.settings).toEqual(SETTINGS);
    expect(parsed.data.progress.attempts).toEqual([]);
    expect(parsed.data.version).toBe(1);
  });

  it("keeps attempts, designs, and hints", () => {
    const challengeId = asChallengeId("personal-blog");
    const architecture = { nodes: [], edges: [], schemaVersion: 1 } as const;
    const progress: ProgressData = {
      attempts: [
        {
          id: newAttemptId(),
          challengeId,
          timestamp: 1,
          maxUsersSustained: 300,
          costUsd: 120,
          stars: 2,
          sloMet: true,
          withinBudget: true,
          architecture,
        },
      ],
      designs: { [challengeId]: architecture },
      hintsUnlocked: { [challengeId]: 2 },
    };

    const parsed = parseExport(serializeExport(buildExport(SETTINGS, progress, 1)));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.data.progress.attempts).toHaveLength(1);
    expect(parsed.data.progress.designs[challengeId]).toEqual(architecture);
    expect(parsed.data.progress.hintsUnlocked[challengeId]).toBe(2);
  });

  it("rejects invalid JSON", () => {
    const parsed = parseExport("{not json");
    expect(parsed.ok).toBe(false);
  });

  it("rejects JSON that is not a ScaleLab export", () => {
    const parsed = parseExport(JSON.stringify({ hello: "world" }));
    expect(parsed.ok).toBe(false);
  });

  it("names files by export date", () => {
    expect(exportFileName(1_700_000_000_000)).toMatch(
      /^scalelab-progress-\d{4}-\d{2}-\d{2}\.json$/,
    );
  });
});
