import { useCallback, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Play,
  Redo2,
  RotateCcw,
  Share2,
  Square,
  Undo2,
} from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";

import {
  MAX_SHARE_LINK_LENGTH,
  encodeArchitecture,
  formatGraphIssue,
  selectArchitecture,
  selectCanRedo,
  selectCanUndo,
  selectCostUsd,
  useDesignStore,
  validateArchitecture,
} from "@/features/architecture";
import { RequirementsSheet, type Challenge } from "@/features/challenges";
import { SIM_SPEEDS, isSimSpeed, type SimSpeed } from "@/features/settings";
import type { RunStatus } from "@/features/simulation";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

const SPEED_ITEMS = SIM_SPEEDS.map((value) => ({
  value: String(value),
  label: `${value}×`,
}));

const STATUS_LABEL: Record<RunStatus, string> = {
  idle: "Ready",
  running: "Running",
  passed: "Passed",
  failed: "Failed",
  stopped: "Stopped",
};

const STATUS_CLASS: Record<RunStatus, string> = {
  idle: "text-muted-foreground",
  running: "border-health-ok/40 bg-health-ok/10 text-health-ok",
  passed: "border-health-ok/40 bg-health-ok/10 text-health-ok",
  failed: "border-health-fail/40 bg-health-fail/10 text-health-fail",
  stopped: "border-health-warm/40 bg-health-warm/10 text-health-warm",
};

type WorkspaceTopbarProps = {
  readonly challenge: Challenge;
  readonly status: RunStatus;
  readonly speed: SimSpeed;
  readonly scenarioIssues: readonly string[];
  readonly onRun: () => void;
  readonly onStop: () => void;
  readonly onSpeedChange: (speed: SimSpeed) => void;
};

export function WorkspaceTopbar({
  challenge,
  status,
  speed,
  scenarioIssues,
  onRun,
  onStop,
  onSpeedChange,
}: WorkspaceTopbarProps) {
  const architecture = useDesignStore(selectArchitecture);
  const costUsd = useDesignStore(selectCostUsd);
  const canUndo = useDesignStore(selectCanUndo);
  const canRedo = useDesignStore(selectCanRedo);
  const undo = useDesignStore((state) => state.undo);
  const redo = useDesignStore((state) => state.redo);
  const validation = useMemo(() => validateArchitecture(architecture), [architecture]);
  const graphIssueCount = validation.ok ? 0 : validation.issues.length;
  const firstGraphIssue = validation.ok ? null : validation.issues[0];
  const firstScenarioIssue = scenarioIssues[0] ?? null;
  const issueCount = graphIssueCount + scenarioIssues.length;
  const isValid = validation.ok && scenarioIssues.length === 0;
  const firstIssueMessage =
    firstScenarioIssue ?? (firstGraphIssue ? formatGraphIssue(firstGraphIssue) : null);
  const running = status === "running";
  const hasFinished = status === "passed" || status === "failed" || status === "stopped";
  const handleShare = useCallback(async () => {
    const payload = encodeArchitecture(architecture);

    if (payload.length > MAX_SHARE_LINK_LENGTH) {
      toast.error("This design is too large to share as a link", {
        description: "Remove a few components or use export to keep a copy.",
      });
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("design", payload);

    try {
      await navigator.clipboard.writeText(url.toString());
      toast.success("Share link copied", {
        description: "Anyone with the link can open this exact design.",
      });
    } catch {
      toast.error("Could not copy the share link");
    }
  }, [architecture]);

  const handleSpeedChange = useCallback(
    (value: string | null) => {
      if (value === null) {
        return;
      }

      const next = Number(value);
      if (isSimSpeed(next)) {
        onSpeedChange(next);
      }
    },
    [onSpeedChange],
  );

  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-card/40 px-4 py-2.5">
      <Button variant="ghost" size="sm" nativeButton={false} render={<Link to="/" />}>
        Challenges
      </Button>
      <span className="text-muted-foreground">/</span>
      <h1 className="text-sm font-medium">{challenge.title}</h1>
      <Badge variant="outline" className="font-mono text-[10px] tracking-wider uppercase">
        Editor · Phase 2/3
      </Badge>
      <Badge variant="outline" className={STATUS_CLASS[status]} aria-live="polite">
        {STATUS_LABEL[status]}
      </Badge>

      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="gap-1.5 font-mono">
          <CircleDollarSign className="size-3" aria-hidden="true" />${Math.round(costUsd)}/mo
        </Badge>

        <Badge
          variant={isValid ? "outline" : "destructive"}
          className="gap-1.5"
          title={firstIssueMessage ?? "Design is ready to run"}
        >
          {isValid ? (
            <CheckCircle2 className="size-3" aria-hidden="true" />
          ) : (
            <AlertTriangle className="size-3" aria-hidden="true" />
          )}
          {isValid ? "Valid" : `${issueCount} issue${issueCount === 1 ? "" : "s"}`}
        </Badge>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Undo"
          title="Undo (Ctrl+Z)"
          disabled={running || !canUndo}
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
          disabled={running || !canRedo}
          onClick={redo}
        >
          <Redo2 />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Copy share link"
          title="Copy share link"
          onClick={handleShare}
        >
          <Share2 />
        </Button>

        <div className="flex items-center gap-1.5">
          <span className="hidden text-[10px] tracking-wider text-muted-foreground uppercase sm:inline">
            Speed
          </span>
          <Select items={SPEED_ITEMS} value={String(speed)} onValueChange={handleSpeedChange}>
            <SelectTrigger size="sm" className="w-18.5" aria-label="Simulation speed">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SIM_SPEEDS.map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {value}×
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <RequirementsSheet challenge={challenge} />

        {running ? (
          <Button type="button" variant="destructive" size="sm" onClick={onStop}>
            <Square />
            Stop
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={onRun}
            disabled={!isValid}
            title={isValid ? "Run the simulated load profile" : "Fix validation issues first"}
          >
            {hasFinished ? <RotateCcw /> : <Play />}
            {hasFinished ? "Run again" : "Run load test"}
          </Button>
        )}
      </div>
    </div>
  );
}
