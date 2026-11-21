import { memo, useCallback, type DragEvent } from "react";
import { useReactFlow } from "@xyflow/react";
import { toast } from "sonner";

import { COMPONENT_CATALOG, defaultComponentParams, monthlyCostUsd } from "../model/catalog";
import { COMPONENT_DRAG_MIME, NODE_CARD_HEIGHT, NODE_CARD_WIDTH } from "../model/editor";
import type { NodeKind } from "../model/types";
import { useDesignStore } from "../store/design-store";
import { ComponentIcon } from "./component-icon";

const PALETTE_GROUPS = [
  {
    label: "Entry",
    kinds: ["clients", "dns", "cdn", "loadBalancer", "apiGateway", "rateLimiter"],
  },
  {
    label: "Compute",
    kinds: ["appServer", "worker"],
  },
  {
    label: "Data",
    kinds: ["cache", "database", "queue", "objectStorage"],
  },
] as const satisfies readonly {
  readonly label: string;
  readonly kinds: readonly NodeKind[];
}[];

type PaletteItemProps = {
  readonly kind: NodeKind;
  readonly disabled: boolean;
  readonly onAdd: (kind: NodeKind) => void;
};

const PaletteItem = memo(function PaletteItem({ kind, disabled, onAdd }: PaletteItemProps) {
  const catalog = COMPONENT_CATALOG[kind];
  const cost = monthlyCostUsd(defaultComponentParams(kind));

  const handleClick = useCallback(() => onAdd(kind), [kind, onAdd]);
  const handleDragStart = useCallback(
    (event: DragEvent<HTMLButtonElement>) => {
      event.dataTransfer.setData(COMPONENT_DRAG_MIME, kind);
      event.dataTransfer.effectAllowed = "move";
    },
    [kind],
  );

  return (
    <button
      type="button"
      draggable={!disabled}
      disabled={disabled}
      title={catalog.description}
      aria-label={disabled ? `${catalog.label} is unavailable` : `Add ${catalog.label}`}
      onClick={handleClick}
      onDragStart={handleDragStart}
      className="group flex w-full cursor-grab items-start gap-2 rounded-lg border border-transparent px-1.5 py-1.5 text-left transition-colors outline-none hover:border-border hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground group-hover:bg-background">
        <ComponentIcon kind={kind} className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-xs font-medium">{catalog.label}</span>
          <span className="shrink-0 font-mono text-[9px] text-muted-foreground">${cost}/mo</span>
        </span>
        <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
          {catalog.description}
        </span>
      </span>
    </button>
  );
});

export function ComponentPalette({ disabled = false }: { readonly disabled?: boolean }) {
  const { screenToFlowPosition } = useReactFlow();
  const addNode = useDesignStore((state) => state.addNode);
  const hasClients = useDesignStore((state) =>
    state.architecture.nodes.some((node) => node.params.kind === "clients"),
  );

  const addAtCanvasCenter = useCallback(
    (kind: NodeKind) => {
      if (disabled) {
        return;
      }

      const canvas = document.querySelector<HTMLElement>("[data-scalelab-canvas]");
      const bounds = canvas?.getBoundingClientRect();
      const clientX = bounds ? bounds.left + bounds.width / 2 : window.innerWidth / 2;
      const clientY = bounds ? bounds.top + bounds.height / 2 : window.innerHeight / 2;
      const point = screenToFlowPosition({ x: clientX, y: clientY });
      const id = addNode(kind, {
        x: point.x - NODE_CARD_WIDTH / 2,
        y: point.y - NODE_CARD_HEIGHT / 2,
      });

      if (!id) {
        toast.error(
          kind === "clients"
            ? "The design already has a traffic source."
            : "Could not add that component.",
        );
      }
    },
    [addNode, disabled, screenToFlowPosition],
  );

  return (
    <aside className="hidden min-h-0 flex-col border-r bg-card/25 lg:flex">
      <div className="border-b px-3 py-3">
        <h2 className="text-xs font-semibold tracking-wider uppercase">Components</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          {disabled
            ? "Locked while the simulation runs."
            : "Drag onto the canvas, or click to drop one in the center."}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {PALETTE_GROUPS.map((group) => (
          <section key={group.label} className="mb-3 last:mb-0" aria-label={group.label}>
            <p className="px-1.5 py-1 text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.kinds.map((kind) => (
                <PaletteItem
                  key={kind}
                  kind={kind}
                  disabled={disabled || (kind === "clients" && hasClients)}
                  onAdd={addAtCanvasCenter}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}
