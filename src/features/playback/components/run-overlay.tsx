import { AlertTriangle, RotateCcw, X } from "lucide-react";

import { Button } from "@/shared/ui/button";
import type { FailureReason, RunOutcome } from "@/features/simulation";

type FailedOutcome = Extract<RunOutcome, { status: "failed" }>;

const VIGNETTE_STYLE = {
  background:
    "radial-gradient(circle at center, transparent 28%, color-mix(in oklch, var(--health-fail) 18%, transparent) 100%)",
} as const;

type RunOverlayProps = {
  readonly outcome: FailedOutcome;
  readonly rootCauseLabel: string;
  readonly onRunAgain: () => void;
  readonly onDismiss: () => void;
};

function reasonLabel(reason: FailureReason): string {
  switch (reason.type) {
    case "queueOverflow":
      return "A queue overflowed under sustained load";
    case "latencySlo":
      return `p95 latency reached ${Math.round(reason.observedP95Ms)} ms`;
    case "errorRate":
      return `Error rate reached ${(reason.observedRatio * 100).toFixed(2)}%`;
    case "storageExhausted":
      return "Storage ran out during the run";
    case "timeout":
      return "The run exceeded its time budget";
  }
}

export function RunOverlay({ outcome, rootCauseLabel, onRunAgain, onDismiss }: RunOverlayProps) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4"
      role="alert"
      aria-live="assertive"
      style={VIGNETTE_STYLE}
    >
      <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-health-fail/40 bg-card p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-health-fail/12 text-health-fail">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-health-fail uppercase">
              System overloaded
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">
              Failed at {Math.round(outcome.atUsers).toLocaleString("en-US")} users
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="ml-auto shrink-0"
            aria-label="Dismiss failure report"
            onClick={onDismiss}
          >
            <X />
          </Button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {reasonLabel(outcome.reason)}. The first bottleneck was{" "}
          <span className="font-medium text-foreground">{rootCauseLabel}</span>.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" onClick={onRunAgain}>
            <RotateCcw />
            Run again
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onDismiss}>
            Edit design
          </Button>
          <span className="ml-auto font-mono text-[10px] text-muted-foreground">
            Root cause: {rootCauseLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
