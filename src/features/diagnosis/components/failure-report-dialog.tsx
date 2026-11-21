import { useCallback, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BookOpen,
  GitCompareArrows,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Wrench,
} from "lucide-react";

import type { ChallengeRequirements } from "@/features/challenges";
import type { RunChartSample, SimulationStep } from "@/features/simulation";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

import type { FailedRunOutcome, FailureDiagnosis } from "../types";
import { P95Sparkline } from "./p95-sparkline";

const NUMBER_FORMAT = new Intl.NumberFormat("en-US");

type FailureReportDialogProps = {
  readonly open: boolean;
  readonly challengeTitle: string;
  readonly requirements: ChallengeRequirements;
  readonly diagnosis: FailureDiagnosis;
  readonly outcome: FailedRunOutcome;
  readonly finalStep: SimulationStep;
  readonly history: readonly RunChartSample[];
  readonly hints: readonly string[];
  readonly hintsShown: number;
  readonly failedAttempts: number;
  readonly canShowSample: boolean;
  readonly canCompare: boolean;
  readonly replay?: ReactNode;
  readonly onOpenChange: (open: boolean) => void;
  readonly onShowNextHint: () => void;
  readonly onCompare: () => void;
  readonly onRunAgain: () => void;
  readonly onEditDesign: () => void;
  readonly onShowSampleSolution: () => void;
};

function reasonLabel(reason: FailedRunOutcome["reason"]): string {
  switch (reason.type) {
    case "errorRate":
      return "Error rate crossed the challenge limit";
    case "latencySlo":
      return "p95 latency crossed the SLO";
    case "queueOverflow":
      return "A queue filled up and dropped work";
    case "storageExhausted":
      return "The database ran out of storage";
    case "timeout":
      return "The run timed out before the target was held";
  }
}

function EvidenceValue({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <dt className="text-[10px] tracking-wider text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 font-mono text-sm">{value}</dd>
    </div>
  );
}

export function FailureReportDialog({
  open,
  challengeTitle,
  requirements,
  diagnosis,
  outcome,
  finalStep,
  history,
  hints,
  hintsShown,
  failedAttempts,
  canShowSample,
  canCompare,
  replay,
  onOpenChange,
  onShowNextHint,
  onCompare,
  onRunAgain,
  onEditDesign,
  onShowSampleSolution,
}: FailureReportDialogProps) {
  const [confirmSample, setConfirmSample] = useState(false);

  const handleSampleAction = useCallback(() => {
    if (confirmSample) {
      onShowSampleSolution();
      return;
    }

    setConfirmSample(true);
  }, [confirmSample, onShowSampleSolution]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setConfirmSample(false);
      }

      onOpenChange(nextOpen);
    },
    [onOpenChange],
  );

  const visibleHints = hints.slice(0, hintsShown);
  const canRevealHint = hintsShown < hints.length;
  const utilization = diagnosis.evidence.nodeUtilizationRatio;
  const queueDepth = diagnosis.evidence.queueDepth;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-health-fail/15 text-health-fail">
              <AlertTriangle className="size-4" />
            </span>
            <Badge variant="outline" className="border-health-fail/40 text-health-fail">
              Run failed
            </Badge>
          </div>
          <DialogTitle className="text-xl leading-tight">
            Your system fell over at {NUMBER_FORMAT.format(outcome.atUsers)} users.
          </DialogTitle>
          <DialogDescription>
            {challengeTitle} · {reasonLabel(outcome.reason)}
          </DialogDescription>
        </DialogHeader>

        <section className="rounded-xl border border-health-fail/25 bg-health-fail/5 p-4">
          <p className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Primary bottleneck
          </p>
          <p className="mt-1 font-medium">{diagnosis.primaryBottleneckLabel}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{diagnosis.summary}</p>
        </section>

        <section aria-labelledby="evidence-heading">
          <h3 id="evidence-heading" className="text-xs font-semibold tracking-wider uppercase">
            Evidence
          </h3>
          <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <EvidenceValue
              label="Utilization"
              value={utilization === null ? "—" : `${Math.round(utilization * 100)}%`}
            />
            <EvidenceValue
              label="Queue"
              value={queueDepth === null ? "—" : NUMBER_FORMAT.format(Math.round(queueDepth))}
            />
            <EvidenceValue
              label="Errors"
              value={`${(diagnosis.evidence.errorRatio * 100).toFixed(1)}%`}
            />
            <EvidenceValue
              label="p95"
              value={`${Math.round(diagnosis.evidence.p95LatencyMs)} / ${requirements.latencyP95Ms} ms`}
            />
          </dl>
          <div className="mt-3 rounded-lg border bg-card/60">
            <P95Sparkline
              history={history}
              endTimeSec={finalStep.timeSec}
              sloMs={requirements.latencyP95Ms}
            />
          </div>
        </section>

        {replay}

        <section className="rounded-xl border bg-muted/25 p-4">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold tracking-wider uppercase">Why this matters</h3>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {diagnosis.whyItMatters}
          </p>
        </section>

        <section aria-labelledby="hints-heading" className="rounded-xl border bg-card/60 p-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="size-4 text-health-warm" />
            <h3 id="hints-heading" className="text-xs font-semibold tracking-wider uppercase">
              Hints
            </h3>
            <Badge variant="outline" className="ml-auto font-mono text-[10px]">
              {hintsShown}/{hints.length}
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{diagnosis.nudge}</p>
          {visibleHints.length > 0 ? (
            <ol className="mt-3 space-y-2">
              {visibleHints.map((hint, index) => (
                <li
                  key={hint}
                  className="flex gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm"
                >
                  <span className="font-mono text-[10px] text-muted-foreground">{index + 1}</span>
                  <span>{hint}</span>
                </li>
              ))}
            </ol>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {canRevealHint ? (
              <Button variant="outline" size="sm" onClick={onShowNextHint}>
                <Lightbulb data-icon="inline-start" />
                Show next hint
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">All hints revealed.</p>
            )}
            <span className="text-[11px] text-muted-foreground">
              {failedAttempts} failed run{failedAttempts === 1 ? "" : "s"} on this challenge
            </span>
          </div>
        </section>

        <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {canShowSample ? (
            <Button
              variant={confirmSample ? "destructive" : "ghost"}
              size="sm"
              className="sm:mr-auto"
              onClick={handleSampleAction}
            >
              <Sparkles data-icon="inline-start" />
              {confirmSample ? "Confirm: replace design" : "Show sample solution"}
            </Button>
          ) : (
            <span className="text-[11px] text-muted-foreground sm:mr-auto">
              Sample solution unlocks after 3 failed runs.
            </span>
          )}
          {canCompare ? (
            <Button variant="ghost" size="sm" onClick={onCompare}>
              <GitCompareArrows data-icon="inline-start" />
              Compare
            </Button>
          ) : null}
          <Button variant="outline" size="sm" onClick={onEditDesign}>
            <Wrench data-icon="inline-start" />
            Edit design
          </Button>
          <Button size="sm" onClick={onRunAgain}>
            <RefreshCw data-icon="inline-start" />
            Run again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
