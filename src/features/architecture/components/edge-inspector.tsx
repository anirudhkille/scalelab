import { useCallback } from "react";
import { ArrowRight, Trash2 } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";

import type { ArchEdge } from "../model/schema";
import { useDesignStore } from "../store/design-store";

type EdgeInspectorProps = {
  readonly edge: ArchEdge;
};

export function EdgeInspector({ edge }: EdgeInspectorProps) {
  const architecture = useDesignStore((state) => state.architecture);
  const removeEdge = useDesignStore((state) => state.removeEdge);
  const source = architecture.nodes.find((node) => node.id === edge.source);
  const target = architecture.nodes.find((node) => node.id === edge.target);
  const handleDelete = useCallback(() => {
    removeEdge(edge.id);
  }, [edge.id, removeEdge]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <p className="text-sm font-medium">Connection</p>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">{edge.id}</p>
      </div>

      <Separator />

      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2.5 text-xs">
        <span className="min-w-0 flex-1 truncate">{source?.label ?? "Unknown"}</span>
        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-right">{target?.label ?? "Unknown"}</span>
      </div>

      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="w-full"
        title="Delete connection (Del)"
        onClick={handleDelete}
      >
        <Trash2 />
        Delete connection
      </Button>
    </div>
  );
}
