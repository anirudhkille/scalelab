import type { LucideIcon } from "lucide-react";

export type RoadmapItem = {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly milestone: string;
  readonly body: string;
};

export function RoadmapCard({ item }: { item: RoadmapItem }) {
  const Icon = item.icon;

  return (
    <article className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-border/80 hover:bg-card/80">
      <div className="flex items-center justify-between">
        <span className="grid size-9 place-items-center rounded-lg border border-border bg-background text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground">
          {item.milestone}
        </span>
      </div>
      <h3 className="mt-4 text-base font-medium">{item.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
    </article>
  );
}
