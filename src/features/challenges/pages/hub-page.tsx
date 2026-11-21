import { ArrowRight, Gauge, Play, Save } from "lucide-react";
import { Link } from "react-router";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

import { RoadmapCard, type RoadmapItem } from "../components/roadmap-card";

const ROADMAP = [
  {
    icon: Play,
    title: "Live load tests",
    milestone: "M4",
    body: "Watch simulated users flow through the graph and saturate the first weak link.",
  },
  {
    icon: Gauge,
    title: "Failure reports",
    milestone: "M5",
    body: "Every run ends with the bottleneck, the evidence, and a nudge toward the fix.",
  },
  {
    icon: Save,
    title: "Saved progress",
    milestone: "M6",
    body: "Keep designs and attempt history locally, with import, export, and reset.",
  },
] as const satisfies readonly RoadmapItem[];

export function HubPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-16">
      <section className="max-w-3xl">
        <Badge variant="outline" className="font-mono text-[10px] tracking-[0.16em] uppercase">
          Canvas editor · M3
        </Badge>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Design it. Break it. <span className="text-primary">Understand exactly why.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          ScaleLab is a system design playground. Pick a challenge, sketch an architecture, then
          push simulated traffic through it until the first component gives out. The failure report
          is the lesson.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Button size="lg" nativeButton={false} render={<Link to="/challenge/personal-blog" />}>
            Open the warm-up
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            nativeButton={false}
            render={<Link to="/challenge/url-shortener" />}
          >
            Try the URL shortener
          </Button>
        </div>
        <p className="mt-4 font-mono text-xs text-muted-foreground">
          100% local · no account · designed for a keyboard
        </p>
      </section>

      <section className="mt-14" aria-labelledby="roadmap-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="roadmap-heading" className="text-lg font-semibold tracking-tight">
              What comes next
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The canvas is ready. Live runs arrive in M4; the challenge catalogue and tuned numbers
              follow in M5.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ROADMAP.map((item) => (
            <RoadmapCard key={item.title} item={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
