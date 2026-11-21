import { Lock, MousePointerClick } from "lucide-react";
import { Link, useParams } from "react-router";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

const CHALLENGE_TITLES: Record<string, string> = {
  "personal-blog": "Personal Blog / Portfolio",
  "url-shortener": "URL Shortener",
};

export function WorkspacePage() {
  const { id = "unknown" } = useParams();
  const title = CHALLENGE_TITLES[id] ?? "Untitled challenge";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b bg-card/40 px-4 py-2.5">
        <Button variant="ghost" size="sm" render={<Link to="/" />}>
          Challenges
        </Button>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-sm font-medium">{title}</h1>
        <Badge variant="outline" className="font-mono text-[10px] tracking-wider uppercase">
          scaffold
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <Lock className="size-3" aria-hidden="true" />
            Editor lands in M3
          </Badge>
          <Button size="sm" disabled>
            Run load test
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_1fr_280px]">
        <aside className="hidden border-r bg-card/20 p-3 lg:block" aria-label="Component palette">
          <p className="px-1 text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Palette
          </p>
          <div className="mt-3 space-y-2">
            {["Clients", "Load balancer", "App server", "Cache", "Database"].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between rounded-md border border-dashed border-border px-2.5 py-2 text-xs text-muted-foreground"
              >
                {item}
                <span className="font-mono text-[10px]">—</span>
              </div>
            ))}
          </div>
        </aside>

        <section
          className="surface-grid relative grid min-h-[420px] place-items-center bg-canvas-bg"
          aria-label="Architecture canvas"
        >
          <div className="max-w-sm rounded-xl border border-dashed border-border bg-card/80 p-6 text-center backdrop-blur-sm">
            <span className="mx-auto grid size-10 place-items-center rounded-lg border border-border bg-background text-primary">
              <MousePointerClick className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-sm font-medium">Canvas shell ready</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              React Flow, drag-and-drop, edges, undo/redo and parameter forms arrive in milestone
              M3.
            </p>
          </div>
        </section>

        <aside className="hidden border-l bg-card/20 p-3 lg:block" aria-label="Inspector">
          <p className="px-1 text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Inspector
          </p>
          <p className="mt-3 rounded-md border border-dashed border-border px-2.5 py-3 text-xs leading-relaxed text-muted-foreground">
            Select a component to edit its capacity, replicas and cost.
          </p>
        </aside>
      </div>

      <div className="border-t bg-card/40 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 font-mono text-xs text-muted-foreground">
          <span>users —</span>
          <span>rps —</span>
          <span>p95 —</span>
          <span>errors —</span>
          <span>cost —</span>
          <span className="ml-auto text-[10px] tracking-wider uppercase">
            Live metrics panel · M4
          </span>
        </div>
      </div>
    </div>
  );
}
