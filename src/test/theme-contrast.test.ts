/// <reference types="node" />
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { contrastRatioOklch, parseOklch } from "@/shared/lib/color";

const themeCss = readFileSync(join(process.cwd(), "src/index.css"), "utf8");

const THEMES = ["midnight", "violet", "terminal", "paper"] as const;

const REQUIRED_TOKENS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "border",
  "input",
  "ring",
  "canvas-bg",
  "canvas-grid",
  "edge",
  "edge-active",
  "health-ok",
  "health-warm",
  "health-hot",
  "health-fail",
  "health-idle",
  "traffic-read",
  "traffic-write",
  "traffic-static",
  "kind-clients",
  "kind-edge",
  "kind-compute",
  "kind-cache",
  "kind-data",
  "kind-queue",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
] as const;

function readThemeTokens(theme: string): Map<string, string> {
  const block = new RegExp(`\\[data-theme=["']${theme}["']\\]\\s*\\{([\\s\\S]*?)\\n\\}`).exec(
    themeCss,
  );
  if (!block?.[1]) throw new Error(`Theme "${theme}" not found in index.css`);

  const tokens = new Map<string, string>();
  for (const match of block[1].matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name && value) tokens.set(name, value.trim());
  }
  return tokens;
}

function assertContrast(
  tokens: Map<string, string>,
  foreground: string,
  background: string,
  minimum: number,
): void {
  const fgSource = tokens.get(foreground);
  const bgSource = tokens.get(background);
  expect(fgSource, `missing --${foreground}`).toBeDefined();
  expect(bgSource, `missing --${background}`).toBeDefined();

  const fg = parseOklch(fgSource ?? "");
  const bg = parseOklch(bgSource ?? "");
  expect(fg, `--${foreground} is not OKLCH`).not.toBeNull();
  expect(bg, `--${background} is not OKLCH`).not.toBeNull();
  if (!fg || !bg) throw new Error(`--${foreground} or --${background} is not OKLCH`);

  const ratio = contrastRatioOklch(fg, bg);
  expect(
    ratio,
    `${foreground} on ${background} is ${ratio.toFixed(2)}:1 (needs ${minimum}:1)`,
  ).toBeGreaterThanOrEqual(minimum);
}

describe("theme tokens", () => {
  it.each(THEMES)("%s defines every required token", (theme) => {
    const tokens = readThemeTokens(theme);
    for (const token of REQUIRED_TOKENS) {
      expect(tokens.has(token), `--${token} missing from ${theme}`).toBe(true);
    }
  });

  describe.each(THEMES)("%s text contrast (WCAG AA 4.5:1)", (theme) => {
    const tokens = readThemeTokens(theme);

    const textPairs: Array<[string, string]> = [
      ["foreground", "background"],
      ["foreground", "card"],
      ["card-foreground", "card"],
      ["popover-foreground", "popover"],
      ["muted-foreground", "background"],
      ["muted-foreground", "card"],
      ["primary-foreground", "primary"],
      ["secondary-foreground", "secondary"],
      ["accent-foreground", "accent"],
    ];

    it.each(textPairs)("%s on %s", (foreground, background) => {
      assertContrast(tokens, foreground, background, 4.5);
    });
  });

  describe.each(THEMES)("%s UI contrast (WCAG 3:1)", (theme) => {
    const tokens = readThemeTokens(theme);

    const uiPairs: Array<[string, string]> = [
      ["ring", "background"],
      ["health-ok", "canvas-bg"],
      ["health-warm", "canvas-bg"],
      ["health-hot", "canvas-bg"],
      ["health-fail", "canvas-bg"],
      ["traffic-read", "canvas-bg"],
      ["traffic-write", "canvas-bg"],
      ["traffic-static", "canvas-bg"],
    ];

    it.each(uiPairs)("%s on %s", (foreground, background) => {
      assertContrast(tokens, foreground, background, 3);
    });
  });
});
