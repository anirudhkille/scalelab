import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, CircleDollarSign, Play, Redo2, Undo2 } from "lucide-react";
import { Link } from "react-router";

import {
  formatGraphIssue,
  selectArchitecture,
  selectCanRedo,
  selectCanUndo,
  selectCostUsd,
  useDesignStore,
  validateArchitecture,
} from "@/features/architecture";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

export function WorkspaceTopbar({ title }: { title: string }) {
  const architecture = useDesignStore(selectArchitecture);
  const costUsd = useDesignStore(selectCostUsd);
  const canUndo = useDesignStore(selectCanUndo);
  const canRedo = useDesignStore(selectCanRedo);
  const undo = useDesignStore((state) => state.undo);
  const redo = useDesignStore((state) => state.redo);
  const validation = useMemo(() => validateArchitecture(architecture), [architecture]);
  const issueCount = validation.ok ? 0 : validation.issues.length;
  const firstIssue = validation.ok ? null : validation.issues[0];

  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-card/40 px-4 py-2.5">
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link to="/" />}>
        Challenges
      </Button>
      <span className="text-muted-foreground">/</span>
      <h1 className="text-sm font-medium">{title}</h1>
      <Badge variant="outline" className="font-mono text-[10px] tracking-wider uppercase">
        Editor · M3
      </Badge>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="gap-1.5 font-mono">
          <CircleDollarSign className="size-3" aria-hidden="true" />${Math.round(costUsd)}/mo
        </Badge>

        <Badge
          variant={validation.ok ? "outline" : "destructive"}
          className="gap-1.5"
          title={firstIssue ? formatGraphIssue(firstIssue) : "Design is ready to run"}
        >
          {validation.ok ? (
            <CheckCircle2 className="size-3" aria-hidden="true" />
          ) : (
            <AlertTriangle className="size-3" aria-hidden="true" />
          )}
          {validation.ok ? "Valid" : `${issueCount} issue${issueCount === 1 ? "" : "s"}`}
        </Badge>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Undo"
          title="Undo (Ctrl+Z)"
          disabled={!canUndo}
          onClick={undo}
        >
          <Undo2 />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Redo"
          title="Redo (Ctrl+Shift+Z)"
          disabled={!canRedo}
          onClick={redo}
        >
          <Redo2 />
        </Button>

        <Button variant="outline" size="sm" disabled title="Challenge requirements arrive with M5">
          Requirements
        </Button>
        <Button size="sm" disabled title="Live load tests arrive in M4">
          <Play />
          Run load test
        </Button>
      </div>
    </div>
  );
}
