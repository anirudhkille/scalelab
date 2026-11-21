import { z } from "zod";

import { settingsSchema, type Settings } from "@/features/settings";

import { progressDataSchema, type ProgressData } from "./schema";

export const EXPORT_FORMAT = "scalelab";
export const EXPORT_VERSION = 1;

export const scaleLabExportSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  version: z.literal(EXPORT_VERSION),
  exportedAt: z.number().int().nonnegative(),
  settings: settingsSchema,
  progress: progressDataSchema,
});

export type ScaleLabExport = z.infer<typeof scaleLabExportSchema>;

export type ImportResult =
  | { readonly ok: true; readonly data: ScaleLabExport }
  | { readonly ok: false; readonly error: string };

export function buildExport(
  settings: Settings,
  progress: ProgressData,
  exportedAt = Date.now(),
): ScaleLabExport {
  return scaleLabExportSchema.parse({
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt,
    settings,
    progress,
  });
}

export function serializeExport(data: ScaleLabExport): string {
  return JSON.stringify(data, null, 2);
}

export function parseExport(text: string): ImportResult {
  let raw: unknown;

  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file is not valid JSON." };
  }

  const parsed = scaleLabExportSchema.safeParse(raw);

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "That file is not a ScaleLab export.",
    };
  }

  return { ok: true, data: parsed.data };
}

export function exportFileName(exportedAt: number): string {
  const date = new Date(exportedAt).toISOString().slice(0, 10);
  return `scalelab-progress-${date}.json`;
}

export function downloadExport(data: ScaleLabExport): void {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    return;
  }

  const blob = new Blob([serializeExport(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = exportFileName(data.exportedAt);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
