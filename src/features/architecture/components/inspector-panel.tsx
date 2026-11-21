import { MousePointerClick } from "lucide-react";

import { EdgeInspector } from "./edge-inspector";
import { NodeInspector } from "./node-inspector";
import { selectSelectedEdge, selectSelectedNode, useDesignStore } from "../store/design-store";

export function InspectorPanel() {
  const selectedNode = useDesignStore(selectSelectedNode);
  const selectedEdge = useDesignStore(selectSelectedEdge);

  return (
    <aside className="hidden min-h-0 flex-col border-l bg-card/25 lg:flex">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-xs font-semibold tracking-wider uppercase">Inspector</h2>
        <span className="font-mono text-[10px] text-muted-foreground">
          {selectedNode ? "node" : selectedEdge ? "edge" : "idle"}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {selectedNode ? <NodeInspector node={selectedNode} /> : null}
        {selectedEdge ? <EdgeInspector edge={selectedEdge} /> : null}

        {!selectedNode && !selectedEdge ? (
          <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <MousePointerClick className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium">Nothing selected</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Click a component or connection to tune it. Changes are tracked in history.
              </p>
            </div>
            <dl className="mt-2 grid grid-cols-[auto_auto] gap-x-3 gap-y-1 font-mono text-[10px] text-muted-foreground">
              <dt>Del</dt>
              <dd className="text-right">remove</dd>
              <dt>Ctrl+D</dt>
              <dd className="text-right">duplicate</dd>
              <dt>Ctrl+Z</dt>
              <dd className="text-right">undo</dd>
            </dl>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
