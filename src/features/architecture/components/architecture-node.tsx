import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { cn } from "@/shared/lib/utils";

import { COMPONENT_CATALOG, monthlyCostUsd } from "../model/catalog";
import type { ComponentParams } from "../model/schema";
import { componentSummary } from "../model/summary";
import { ComponentIcon } from "./component-icon";

export type ArchitectureNodeData = {
  readonly label: string;
  readonly params: ComponentParams;
};

export type ArchitectureFlowNode = Node<ArchitectureNodeData, "architecture">;

function ArchitectureNodeComponent({ data, selected }: NodeProps<ArchitectureFlowNode>) {
  const kind = data.params.kind;
  const catalog = COMPONENT_CATALOG[kind];

  return (
    <article
      aria-label={`${data.label} — ${catalog.label}`}
      className={cn(
        "relative flex h-[124px] w-[220px] flex-col rounded-xl border bg-card px-3 py-2.5 text-left shadow-sm transition-[border-color,box-shadow]",
        selected
          ? "border-ring shadow-md ring-2 ring-ring/35"
          : "border-border hover:border-ring/45",
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
            <span className="size-1.5 rounded-full bg-health-idle" aria-hidden="true" />
            <p className="truncate text-[10px] tracking-wider text-muted-foreground uppercase">
              {catalog.label}
            </p>
          </div>
        </div>
      </div>

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
