import {
  Boxes,
  Cloud,
  Database,
  Gauge,
  GitBranch,
  Layers,
  Radio,
  ShieldCheck,
  Sparkles,
  Waypoints,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageMeta } from "@/shared/seo";

type ConceptCard = {
  readonly title: string;
  readonly icon: LucideIcon;
  readonly summary: string;
  readonly whenToUse: string;
  readonly tradeoff: string;
};

const CONCEPTS: readonly ConceptCard[] = [
  {
    title: "Caching",
    icon: Layers,
    summary: "Keep hot reads in memory so the database only sees misses.",
    whenToUse: "Read-heavy traffic with a working set that fits in memory.",
    tradeoff: "Freshness and memory cost. A cache that is too small barely helps.",
  },
  {
    title: "CDN",
    icon: Cloud,
    summary: "Serve static bytes from an edge close to the user.",
    whenToUse: "Images, scripts, media, and any cacheable response.",
    tradeoff: "Stale content and cache invalidation. Dynamic requests still hit origin.",
  },
  {
    title: "Queues",
    icon: Waypoints,
    summary: "Accept work quickly, then drain it at a safe rate.",
    whenToUse: "Bursty writes or work that can finish after the response.",
    tradeoff: "Delivery lag and duplicate work. A full queue becomes a failure.",
  },
  {
    title: "Workers",
    icon: Boxes,
    summary: "Run background jobs at a predictable throughput.",
    whenToUse: "Fan-out, notifications, image processing, and async writes.",
    tradeoff: "More moving parts and eventual consistency. Workers can lag behind.",
  },
  {
    title: "Read replicas",
    icon: GitBranch,
    summary: "Spread read traffic across copies of the database.",
    whenToUse: "Read-heavy systems whose primary is saturated by reads.",
    tradeoff: "Replication lag and extra cost. Writes still go to the primary.",
  },
  {
    title: "Sharding",
    icon: Database,
    summary: "Split data across databases by a shard key.",
    whenToUse: "Data or write volume that one primary cannot hold.",
    tradeoff: "Hot shards, cross-shard queries, and operational complexity.",
  },
  {
    title: "Rate limiting",
    icon: ShieldCheck,
    summary: "Reject excess requests before they reach expensive tiers.",
    whenToUse: "Abuse, retry storms, and sudden flash-sale spikes.",
    tradeoff: "Legitimate users can be throttled. Limits must match real capacity.",
  },
  {
    title: "Backpressure",
    icon: Radio,
    summary: "Let queue depth and latency tell you when to slow down.",
    whenToUse: "Any async pipeline whose producers can outrun consumers.",
    tradeoff: "Ignoring it turns a slow system into a dropping system.",
  },
  {
    title: "Multi-region",
    icon: Gauge,
    summary: "Place components close to users and survive a zone outage.",
    whenToUse: "Latency-sensitive users or availability targets above one zone.",
    tradeoff: "Cross-region calls add latency, and data consistency gets harder.",
  },
];

export function LearnPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <PageMeta
        title="System Design Concepts — ScaleLab"
        description="Short explainers for caching, CDNs, queues, workers, replicas, sharding, rate limiting, backpressure, and multi-region design."
        path="/learn"
      />

      <div className="max-w-2xl">
        <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
          <Sparkles className="size-3" aria-hidden="true" />
          Concept library
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance">
          The ideas behind every failure report
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Short explainers for the techniques ScaleLab models. Each card covers what the idea does,
          when to reach for it, and the trade-off it buys you.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CONCEPTS.map((concept) => (
          <article
            key={concept.title}
            className="flex flex-col rounded-xl border border-border bg-card p-5"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
              <concept.icon className="size-4" aria-hidden="true" />
            </span>
            <h2 className="mt-3 text-base font-semibold">{concept.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{concept.summary}</p>
            <dl className="mt-4 space-y-2 border-t border-border/70 pt-3 text-xs">
              <div>
                <dt className="font-medium text-foreground">Use it when</dt>
                <dd className="mt-0.5 leading-relaxed text-muted-foreground">
                  {concept.whenToUse}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Trade-off</dt>
                <dd className="mt-0.5 leading-relaxed text-muted-foreground">{concept.tradeoff}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
