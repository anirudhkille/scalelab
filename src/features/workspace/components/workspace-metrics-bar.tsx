const METRICS = ["users", "rps", "p95", "errors", "cost"] as const;

export function WorkspaceMetricsBar() {
  return (
    <div className="border-t bg-card/40 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 font-mono text-xs text-muted-foreground">
        {METRICS.map((metric) => (
          <span key={metric}>{metric} —</span>
        ))}
        <span className="ml-auto text-[10px] tracking-wider uppercase">
          Live metrics panel · M4
        </span>
      </div>
    </div>
  );
}
