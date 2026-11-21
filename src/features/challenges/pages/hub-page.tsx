import { ArrowRight, BookOpen, FlaskConical, Wrench } from "lucide-react";
import { Link } from "react-router";

import { PageMeta } from "@/shared/seo";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { RoadmapCard, type RoadmapItem } from "../components/roadmap-card";
import { ChallengeCard } from "../components/challenge-card";
import { CHALLENGES } from "../data/catalog";
import { CHALLENGE_PACKS, CHALLENGE_PACK_META } from "../packs";

const EXPLORE = [
  {
    icon: Wrench,
    title: "Custom challenge editor",
    milestone: "Authoring",
    body: "Pick a base design, tune the requirements and load profile, then save it locally or import JSON.",
  },
  {
    icon: BookOpen,
    title: "Sandbox + concept library",
    milestone: "Practice",
    body: "Run arbitrary load shapes against a reference design, then read the concepts behind the bottleneck.",
  },
] as const satisfies readonly RoadmapItem[];

export function HubPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-16">
      <PageMeta
        title="ScaleLab — System Design Stress-Testing Playground"
        description="Build a system architecture, hit it with simulated traffic and injected failures, then learn exactly which component breaks first."
        path="/"
      />

      <section className="max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
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
          <Button nativeButton={false} render={<Link to="/custom" />} variant="outline">
            <Wrench className="size-4" aria-hidden="true" />
            Build a custom challenge
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
              Twelve systems grouped into four packs, from a static portfolio to a global service.
              Each one has a different bottleneck waiting for you, and later challenges inject
              failures mid-run.
            </p>
          </div>
          <Badge variant="secondary">{CHALLENGES.length} challenges</Badge>
        </div>

        <div className="mt-6 space-y-8">
          {CHALLENGE_PACKS.map((pack) => {
            const challenges = CHALLENGES.filter((challenge) => challenge.pack === pack);
            const meta = CHALLENGE_PACK_META[pack];

            if (challenges.length === 0) {
              return null;
            }

            return (
              <div key={pack}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="text-sm font-semibold tracking-tight">{meta.label}</h3>
                  <p className="text-xs text-muted-foreground">{meta.description}</p>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {challenges.length}
                  </span>
                </div>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {challenges.map((challenge) => (
                    <ChallengeCard key={challenge.id} challenge={challenge} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="explore-heading">
        <h2 id="explore-heading" className="text-sm font-semibold tracking-wider uppercase">
          Keep exploring
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Failure injection, multi-region placement, the sandbox, share links, concept cards, and
          custom challenges are all live.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {EXPLORE.map((item) => (
            <RoadmapCard key={item.title} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
