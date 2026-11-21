import { ArrowRight, BookOpen, FlaskConical, Layers } from "lucide-react";
import { Link } from "react-router";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { RoadmapCard, type RoadmapItem } from "../components/roadmap-card";
import { ChallengeCard } from "../components/challenge-card";
import { CHALLENGES } from "../data/catalog";

const ROADMAP = [
  {
    icon: BookOpen,
    title: "Challenges 6–9",
    milestone: "Phase 3",
    body: "Search, video, analytics, and IoT pipelines — more traffic shapes and more failure modes.",
  },
  {
    icon: Layers,
    title: "Custom challenge editor",
    milestone: "Phase 3",
    body: "Author your own requirements, load profile, and starter design, then import it as JSON.",
  },
] as const satisfies readonly RoadmapItem[];

export function HubPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-16">
      <section className="max-w-3xl">
        <Badge variant="outline" className="font-mono text-[10px] tracking-[0.16em] uppercase">
          Resilience + scale · Phase 2/3
        </Badge>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Design it. Break it. <span className="text-primary">Understand exactly why.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          ScaleLab is a local-first systems playground. Build an architecture, break it with traffic
          and injected failures, then learn from the first component that gives out.
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
          <Button nativeButton={false} render={<Link to="/sandbox" />} variant="outline">
            <FlaskConical className="size-4" aria-hidden="true" />
            Open sandbox
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
              bottleneck waiting for you — and later challenges inject failures mid-run.
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
          Failure injection, multi-region placement, the sandbox, share links, and concept cards are
          live. Next: more scenarios and authoring.
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
