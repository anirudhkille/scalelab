import { ArrowRight, CheckCircle2, Clock, ListChecks, Play, Timer } from "lucide-react";
import { Link } from "react-router";

import {
  CHALLENGES,
  difficultyLabel,
  starterArchitectureFor,
  type Challenge,
} from "@/features/challenges";
import { useAttemptStore } from "@/features/progress";
import { PageMeta } from "@/shared/seo";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

import { buildTradeoffPrompts } from "../prompts";
import { INTERVIEW_DURATION_SEC, type InterviewSession } from "../schema";
import { useInterviewStore } from "../store/interview-store";

const DRILL_STEPS = [
  {
    icon: Timer,
    title: "25-minute clock",
    body: "The timer keeps running across reloads. Finish early when you have said enough.",
  },
  {
    icon: ListChecks,
    title: "Tradeoffs, not trivia",
    body: "Capacity, bottlenecks, then questions generated from the components in your design.",
  },
  {
    icon: CheckCircle2,
    title: "Compare with notes",
    body: "Write your answer first, then reveal model notes and the signals a strong answer covers.",
  },
] as const;

function sessionStatus(session: InterviewSession | undefined): {
  readonly label: string;
  readonly variant: "secondary" | "outline" | "default";
} {
  if (!session) {
    return { label: "Not started", variant: "outline" };
  }

  if (session.completedAt !== undefined) {
    return { label: "Review", variant: "secondary" };
  }

  return { label: "In progress", variant: "default" };
}

function InterviewCard({
  challenge,
  session,
  promptCount,
}: {
  readonly challenge: Challenge;
  readonly session: InterviewSession | undefined;
  readonly promptCount: number;
}) {
  const status = sessionStatus(session);
  const answered = session
    ? Object.values(session.answers).filter((answer) => answer.trim().length > 0).length
    : 0;

  return (
    <article className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-ring/50">
      <div className="flex items-start justify-between gap-3">
        <Badge variant="outline" className="font-mono text-[10px] tracking-wider uppercase">
          {difficultyLabel(challenge.difficulty)}
        </Badge>
        <Badge variant={status.variant} className="font-normal">
          {status.label}
        </Badge>
      </div>

      <h3 className="mt-3 text-lg font-semibold tracking-tight">{challenge.title}</h3>
      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {challenge.concepts.join(" · ")}
      </p>

      <div className="mt-3 flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="size-3" aria-hidden="true" />
          {INTERVIEW_DURATION_SEC / 60} min
        </span>
        <span className="flex items-center gap-1">
          <ListChecks className="size-3" aria-hidden="true" />
          {promptCount} prompts
        </span>
        {session ? <span>{answered} answered</span> : null}
      </div>

      <Button
        nativeButton={false}
        render={<Link to={`/interview/${challenge.id}`} />}
        variant={status.label === "In progress" ? "default" : "outline"}
        size="sm"
        className="mt-4 w-full justify-between group-hover:bg-muted/60"
      >
        {status.label === "Not started"
          ? "Start drill"
          : status.label === "Review"
            ? "Review answers"
            : "Resume drill"}
        {status.label === "Review" ? <ArrowRight /> : <Play />}
      </Button>
    </article>
  );
}

export function InterviewHubPage() {
  const sessions = useInterviewStore((state) => state.sessions);
  const designs = useAttemptStore((state) => state.designs);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <PageMeta
        title="Interview mode — ScaleLab"
        description="Timed system design drills: estimate capacity, explain tradeoffs, and compare your answers with model notes."
        path="/interview"
      />

      <section className="max-w-3xl">
        <p className="font-mono text-[10px] tracking-wider text-primary uppercase">
          Interview mode
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Practice saying <span className="text-primary">why</span>, not just what.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          A timed drill built from your design. Answer the capacity and bottleneck questions,
          justify the components you chose, then compare with model notes. Everything stays on this
          device.
        </p>
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-3" aria-label="How interview mode works">
        {DRILL_STEPS.map((step) => (
          <div key={step.title} className="rounded-xl border bg-card/40 p-4">
            <step.icon className="size-4 text-primary" aria-hidden="true" />
            <h2 className="mt-2 text-sm font-medium">{step.title}</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-10" aria-labelledby="interview-challenges-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="interview-challenges-heading" className="text-lg font-semibold tracking-tight">
              Pick a system
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Questions adapt to the components already in your saved design. Open one and answer
              out loud before you type.
            </p>
          </div>
          <Badge variant="secondary">{CHALLENGES.length} drills</Badge>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CHALLENGES.map((challenge) => {
            const design =
              designs[challenge.id] ??
              challenge.starterArchitecture ??
              starterArchitectureFor(challenge.id);
            const promptCount = buildTradeoffPrompts(design).length;

            return (
              <InterviewCard
                key={challenge.id}
                challenge={challenge}
                session={sessions[String(challenge.id)]}
                promptCount={promptCount}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
