export function WorkspaceInspector() {
  return (
    <aside className="hidden border-l bg-card/20 p-3 lg:block" aria-label="Inspector">
      <p className="px-1 text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
        Inspector
      </p>
      <p className="mt-3 rounded-md border border-dashed border-border px-2.5 py-3 text-xs leading-relaxed text-muted-foreground">
        Select a component to edit its capacity, replicas and cost.
      </p>
    </aside>
  );
}
