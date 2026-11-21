const PALETTE_ITEMS = ["Clients", "Load balancer", "App server", "Cache", "Database"] as const;

export function WorkspacePalette() {
  return (
    <aside className="hidden border-r bg-card/20 p-3 lg:block" aria-label="Component palette">
      <p className="px-1 text-[10px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
        Palette
      </p>
      <div className="mt-3 space-y-2">
        {PALETTE_ITEMS.map((item) => (
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
  );
}
