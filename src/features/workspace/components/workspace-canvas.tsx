import { MousePointerClick } from "lucide-react";

export function WorkspaceCanvas() {
  return (
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
          React Flow, drag-and-drop, edges, undo/redo and parameter forms arrive in milestone M3.
        </p>
      </div>
    </section>
  );
}
