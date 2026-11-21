import { Activity } from "lucide-react";

import { cn } from "@/shared/lib/utils";

export function AppLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative grid size-7 place-items-center rounded-md border border-border bg-card text-primary">
        <Activity className="size-4" aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-sm font-semibold tracking-tight">ScaleLab</span>
        <span className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
          stress lab
        </span>
      </span>
    </span>
  );
}
