import { useEffect, useMemo } from "react";
import { Link, Navigate, useParams } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  ListChecks,
  RefreshCw,
} from "lucide-react";

import {
  COMPONENT_CATALOG,
  architectureMonthlyCostUsd,
  type Architecture,
} from "@/features/architecture";
import {
  challengeFor,
  estimateLoad,
  starterArchitectureFor,
  type Challenge,
} from "@/features/challenges";
import { useAttemptStore } from "@/features/progress";
import { PageMeta } from "@/shared/seo";
import { Button } from "@/shared/ui/button";

import { TradeoffCard } from "../components/tradeoff-card";
import { buildTradeoffPrompts } from "../prompts";
import { INTERVIEW_DURATION_SEC, type InterviewSession } from "../schema";
import { useInterviewStore } from "../store/interview-store";
import { formatClock, useInterviewClock } from "../use-interview-clock";

const NUMBER_FORMAT = new Intl.NumberFormat("en-US");

function savedDesignFor(challenge: Challenge, design: Architecture | undefined): Architecture {
  return design ?? challenge.starterArchitecture ?? starterArchitectureFor(challenge.id);
}

function designSummary(architecture: Architecture): string {
  const counts = new Map<string, number>();

  for (const node of architecture.nodes) {
    counts.set(node.params.kind, (counts.get(node.params.kind) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([kind, count]) => {
      const label = COMPONENT_CATALOG[kind as keyof typeof COMPONENT_CATALOG].label;
      return `${count}× ${label}`;
    })
    .join(", ");
}

export function InterviewPage() {
  const { id } = useParams<{ id: string }>();
  const challenge = id ? challengeFor(id) : null;

  if (!challenge) {
    return <Navigate to="/interview" replace />;
  }

  return <InterviewSessionView key={challenge.id} challenge={challenge} />;
}

function InterviewSessionView({ challenge }: { readonly challenge: Challenge }) {
  const session = useInterviewStore((state) => state.sessions[String(challenge.id)]);
  const startSession = useInterviewStore((state) => state.startSession);
  const resetSession = useInterviewStore((state) => state.resetSession);
  const setAnswer = useInterviewStore((state) => state.setAnswer);
  const revealNotes = useInterviewStore((state) => state.revealNotes);
  const completeSession = useInterviewStore((state) => state.completeSession);
  const savedDesign = useAttemptStore((state) => state.designs[challenge.id]);
  const architecture = useMemo(
    () => savedDesignFor(challenge, savedDesign),
    [challenge, savedDesign],
  );
  const prompts = useMemo(() => buildTradeoffPrompts(architecture), [architecture]);
  const clock = useInterviewClock(session);
  const completed = session?.completedAt !== undefined;

  useEffect(() => {
    if (session) {
      return;
    }

    startSession(challenge.id, INTERVIEW_DURATION_SEC, Date.now());
  }, [challenge.id, session, startSession]);

  useEffect(() => {
    if (!session || completed || !clock.expired) {
      return;
    }

    completeSession(challenge.id, Date.now());
  }, [challenge.id, clock.expired, completeSession, completed, session]);

  const answeredCount = prompts.filter(
    (prompt) => (session?.answers[prompt.id] ?? "").trim().length > 0,
  ).length;
  const locked = completed || clock.expired;
  const requirements = challenge.requirements;
  const estimate = estimateLoad({
    users: requirements.targetUsers,
    requestsPerUserPerSec: requirements.requestsPerUserPerSec,
    peakToAverageRatio: 3,
    readRatio: requirements.readRatio,
    responseSizeKb: 2,
    recordSizeKb: 1,
  });
  const monthlyCost = architectureMonthlyCostUsd(architecture);
  const remainingRatio = session
    ? Math.max(0, Math.min(1, clock.remainingSec / session.durationSec))
    : 1;

  const handleNewAttempt = () => {
    resetSession(challenge.id);
    startSession(challenge.id, INTERVIEW_DURATION_SEC, Date.now());
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <PageMeta
        title={`${challenge.title} interview — ScaleLab`}
        description="A timed system design interview drill with capacity estimates, tradeoff questions, and model answer notes."
        path={`/interview/${challenge.id}`}
      />

      <Link
        to="/interview"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        All interviews
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            Interview drill
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {challenge.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Talk through the numbers and tradeoffs behind your design. Answer before revealing the
            notes, then compare what you missed.
          </p>
        </div>
        <SessionTimer
          session={session}
          completed={completed}
          expired={clock.expired}
          remainingSec={clock.remainingSec}
          remainingRatio={remainingRatio}
        />
      </div>

      {completed ? (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
          <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Attempt finished</p>
            <p className="text-xs text-muted-foreground">
              {answeredCount} of {prompts.length} prompts answered. Notes are unlocked so you can
              review the gaps.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={handleNewAttempt}>
            <RefreshCw data-icon="inline-start" />
            New attempt
          </Button>
        </div>
      ) : clock.expired ? (
        <div className="border-failure/30 bg-failure/5 mt-5 rounded-xl border p-4 text-sm">
          Time is up. Answers are locked and the notes are open for review.
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Tradeoff questions" className="space-y-3">
          {prompts.map((prompt, index) => (
            <TradeoffCard
              key={prompt.id}
              prompt={prompt}
              index={index}
              answer={session?.answers[prompt.id] ?? ""}
              revealed={completed || (session?.revealed.includes(prompt.id) ?? false)}
              locked={locked}
              onChange={(answer) => setAnswer(challenge.id, prompt.id, answer)}
              onReveal={() => revealNotes(challenge.id, prompt.id)}
            />
          ))}

          {!completed ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/40 p-4">
              <p className="text-xs text-muted-foreground">
                {answeredCount} of {prompts.length} answered. Finishing locks every answer.
              </p>
              <Button
                type="button"
                onClick={() => completeSession(challenge.id, Date.now())}
                disabled={answeredCount === 0}
              >
                <CheckCircle2 data-icon="inline-start" />
                Finish attempt
              </Button>
            </div>
          ) : null}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border bg-card/60 p-4">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <ListChecks className="size-4 text-primary" aria-hidden="true" />
              Requirements
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <Requirement
                label="Target users"
                value={NUMBER_FORMAT.format(requirements.targetUsers)}
              />
              <Requirement
                label="Requests / user / s"
                value={requirements.requestsPerUserPerSec.toFixed(1)}
              />
              <Requirement
                label="Peak QPS"
                value={`${NUMBER_FORMAT.format(Math.round(estimate.peakQps))}`}
              />
              <Requirement label="p95 SLO" value={`${requirements.latencyP95Ms} ms`} />
              <Requirement label="Data" value={`${requirements.dataSizeGb} GB`} />
              <Requirement
                label="Availability"
                value={
                  requirements.availabilityRatio === undefined
                    ? "—"
                    : `${(requirements.availabilityRatio * 100).toFixed(1)}%`
                }
              />
              <Requirement
                label="Read share"
                value={`${Math.round(requirements.readRatio * 100)}%`}
              />
              <Requirement
                label="Budget"
                value={`$${NUMBER_FORMAT.format(requirements.monthlyBudgetUsd)}/mo`}
              />
            </dl>
          </div>

          <div className="rounded-xl border bg-card/60 p-4">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <Layers className="size-4 text-primary" aria-hidden="true" />
              Your design
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {designSummary(architecture)}
            </p>
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
              ${NUMBER_FORMAT.format(Math.round(monthlyCost))}/month · {architecture.nodes.length}{" "}
              nodes
            </p>
            <Button
              nativeButton={false}
              render={<Link to={`/challenge/${challenge.id}`} />}
              variant="outline"
              size="sm"
              className="mt-3 w-full justify-between"
            >
              Edit in workspace
              <ArrowRight />
            </Button>
          </div>

          <div className="rounded-xl border bg-card/40 p-4 text-xs leading-relaxed text-muted-foreground">
            <p className="flex items-center gap-2 font-medium text-foreground">
              <Clock className="size-3.5" aria-hidden="true" />
              Timed practice
            </p>
            <p className="mt-2">
              The clock keeps running if you leave the page. Answers and revealed notes are saved on
              this device only.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Requirement({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 font-mono text-foreground">{value}</dd>
    </div>
  );
}

function SessionTimer({
  session,
  completed,
  expired,
  remainingSec,
  remainingRatio,
}: {
  readonly session: InterviewSession | undefined;
  readonly completed: boolean;
  readonly expired: boolean;
  readonly remainingSec: number;
  readonly remainingRatio: number;
}) {
  if (!session) {
    return null;
  }

  return (
    <div className="w-full max-w-56 rounded-xl border bg-card/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] tracking-wider text-muted-foreground uppercase">
          <Clock className="size-3" aria-hidden="true" />
          {completed ? "Finished" : expired ? "Time up" : "Remaining"}
        </span>
        <span
          className={`font-mono text-lg tabular-nums ${expired && !completed ? "text-failure" : ""}`}
        >
          {completed ? "done" : formatClock(remainingSec)}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${
            expired ? "bg-failure" : "bg-primary"
          }`}
          style={{ width: `${remainingRatio * 100}%` }}
        />
      </div>
      <p className="mt-2 font-mono text-[10px] text-muted-foreground">
        {formatClock(session.durationSec)} drill ·{" "}
        {formatClock(Math.min(remainingSec, session.durationSec))} left
      </p>
    </div>
  );
}
