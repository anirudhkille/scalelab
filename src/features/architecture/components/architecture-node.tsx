import { memo, useMemo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { cn } from "@/shared/lib/utils";

import { COMPONENT_CATALOG, monthlyCostUsd } from "../model/catalog";
import {
  healthLevel,
  queuePressureRatio,
  type NodeHealth,
  type NodeHealthLevel,
} from "../model/health";
import type { ComponentParams } from "../model/schema";
import { componentSummary } from "../model/summary";
import { ComponentIcon } from "./component-icon";

const HEALTH_DOT: Record<NodeHealthLevel, string> = {
  idle: "bg-health-idle",
  ok: "bg-health-ok",
  warm: "bg-health-warm",
  hot: "bg-health-hot",
  fail: "bg-health-fail",
};

const HEALTH_BORDER: Record<NodeHealthLevel, string> = {
  idle: "border-border",
  ok: "border-health-ok/45",
  warm: "border-health-warm/55",
  hot: "border-health-hot/65",
  fail: "border-health-fail/75",
};

const HEALTH_BAR: Record<NodeHealthLevel, string> = {
  idle: "bg-health-idle",
  ok: "bg-health-ok",
  warm: "bg-health-warm",
  hot: "bg-health-hot",
  fail: "bg-health-fail",
};

const CROWD_DOTS = ["one", "two", "three", "four", "five", "six", "seven", "eight"] as const;
const COMPACT_NUMBER = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export type ArchitectureNodeData = {
  readonly label: string;
  readonly params: ComponentParams;
  readonly health?: NodeHealth;
  readonly crowdUsers?: number;
};

export type ArchitectureFlowNode = Node<ArchitectureNodeData, "architecture">;

function ArchitectureNodeComponent({ data, selected }: NodeProps<ArchitectureFlowNode>) {
  const kind = data.params.kind;
  const catalog = COMPONENT_CATALOG[kind];
  const level = healthLevel(data.health);
  const utilization = data.health?.utilizationRatio ?? 0;
  const queuePressure = queuePressureRatio(data.health?.queueDepth ?? 0);
  const crowdUsers = data.crowdUsers ?? 0;
  const filledCrowdDots =
    kind === "clients" ? Math.min(CROWD_DOTS.length, Math.ceil(crowdUsers / 75)) : 0;
  const utilizationStyle = useMemo(
    () => ({ width: `${Math.round(utilization * 100)}%` }),
    [utilization],
  );
  const queueStyle = useMemo(
    () => ({ width: `${Math.round(queuePressure * 100)}%` }),
    [queuePressure],
  );

  return (
    <article
      aria-label={`${data.label} — ${catalog.label}`}
      className={cn(
        "relative flex h-37 w-55 flex-col rounded-xl border bg-card px-3 py-2.5 text-left shadow-sm transition-[border-color,box-shadow]",
        selected
          ? "border-ring shadow-md ring-2 ring-ring/35"
          : cn(HEALTH_BORDER[level], "hover:border-ring/45"),
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className={cn(
          "!size-2.5 !border-2 !border-background !bg-muted-foreground",
          kind === "clients" && "hidden",
        )}
      />

      <div className="flex items-start gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          <ComponentIcon kind={kind} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm leading-tight font-medium">{data.label}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className={cn("size-1.5 rounded-full", HEALTH_DOT[level])} aria-hidden="true" />
            <p className="truncate text-[10px] tracking-wider text-muted-foreground uppercase">
              {catalog.label}
            </p>
          </div>
        </div>
      </div>

      {kind === "clients" ? (
        <div className="mt-2.5 rounded-lg border border-border/70 bg-muted/25 px-2 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] tracking-wider text-muted-foreground uppercase">
              Crowd
            </span>
            <span className="font-mono text-[11px] text-foreground">
              {COMPACT_NUMBER.format(crowdUsers)} users
            </span>
          </div>
          <div className="mt-1.5 flex gap-1" aria-hidden="true">
            {CROWD_DOTS.map((dot, index) => (
              <span
                key={dot}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  index < filledCrowdDots ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-2.5 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-8 shrink-0 font-mono text-[9px] tracking-wider text-muted-foreground uppercase">
              util
            </span>
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", HEALTH_BAR[level])}
                style={utilizationStyle}
              />
            </div>
            <span className="w-8 shrink-0 text-right font-mono text-[9px] text-muted-foreground">
              {Math.round(utilization * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-8 shrink-0 font-mono text-[9px] tracking-wider text-muted-foreground uppercase">
              queue
            </span>
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", HEALTH_BAR[level])} style={queueStyle} />
            </div>
            <span className="w-8 shrink-0 text-right font-mono text-[9px] text-muted-foreground">
              {Math.round(data.health?.queueDepth ?? 0)}
            </span>
          </div>
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/35 px-2 py-1.5">
        <span className="min-w-0 truncate font-mono text-[10px] text-muted-foreground">
          {componentSummary(data.params)}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-foreground">
          ${monthlyCostUsd(data.params)}/mo
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!size-2.5 !border-2 !border-background !bg-muted-foreground"
      />
    </article>
  );
}

export const ArchitectureNode = memo(ArchitectureNodeComponent);
