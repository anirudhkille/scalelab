import { ArrowRight, BookOpen, Zap } from "lucide-react";
import { Link } from "react-router";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { RoadmapCard, type RoadmapItem } from "../components/roadmap-card";
import { ChallengeCard } from "../components/challenge-card";
import { CHALLENGES } from "../data/catalog";

const ROADMAP = [
  {
    icon: Zap,
    title: "Failure injection",
    milestone: "Phase 2",
    body: "Kill nodes, slow storage, and simulate an availability zone outage, with availability scoring.",
  },
  {
    icon: BookOpen,
    title: "More ways to learn",
    milestone: "Phase 2",
    body: "Challenges 6–9, concept cards, and richer sharing so each failure becomes a lesson.",
  },
] as const satisfies readonly RoadmapItem[];

export function HubPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-16">
      <section className="max-w-3xl">
        <Badge variant="outline" className="font-mono text-[10px] tracking-[0.16em] uppercase">
          Polish + launch · M7
        </Badge>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Design it. Break it. <span className="text-primary">Understand exactly why.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          ScaleLab is a local-first systems playground. Build an architecture, push simulated
          traffic through it, and learn from the first component that gives out.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button nativeButton={false} render={<Link to="/challenge/personal-blog" />}>
            Open the warm-up
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
          <Button
            nativeButton={false}
            render={<Link to="/challenge/flash-sale" />}
            variant="outline"
          >
            Try the flash sale
          </Button>
        </div>
        <p className="mt-3 font-mono text-[11px] text-muted-foreground">
          No account. No backend. Everything runs in your browser.
        </p>
      </section>

      <section className="mt-12" aria-labelledby="challenges-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="challenges-heading" className="text-lg font-semibold tracking-tight">
              Challenges
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Five systems, from a static portfolio to a flash sale. Each one has a different
              bottleneck waiting for you.
            </p>
          </div>
          <Badge variant="secondary">{CHALLENGES.length} challenges</Badge>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CHALLENGES.map((challenge) => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="roadmap-heading">
        <h2 id="roadmap-heading" className="text-sm font-semibold tracking-wider uppercase">
          What comes next
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The full MVP loop is in. The next phase adds failure injection, more challenges, and
          concept cards.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {ROADMAP.map((item) => (
            <RoadmapCard key={item.title} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
