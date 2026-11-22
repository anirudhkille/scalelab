import { useCallback, useMemo, useState } from "react";
import { FlaskConical, Play, Square } from "lucide-react";

import { challengeOrFallback, referenceArchitectureFor } from "@/features/challenges";
import { LiveMetricsPanel } from "@/features/playback";
import { scoreAttempt } from "@/features/progress";
import {
  selectRunResult,
  selectRunStatus,
  selectRunStep,
  useRunSimulation,
  useRunStore,
  type SimulationConfig,
} from "@/features/simulation";
import { PageMeta } from "@/shared/seo";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

import {
  DEFAULT_SANDBOX_SETTINGS,
  SANDBOX_DESIGNS,
  type SandboxSettings,
} from "../model/sandbox-config";
import { SandboxSidebar } from "../components/sandbox-sidebar";

export function SandboxPage() {
  const [designId, setDesignId] = useState<string>(SANDBOX_DESIGNS[0].id);
  const [settings, setSettings] = useState<SandboxSettings>(DEFAULT_SANDBOX_SETTINGS);
  const status = useRunStore(selectRunStatus);
  const step = useRunStore(selectRunStep);
  const result = useRunStore(selectRunResult);
  const resetRun = useRunStore((state) => state.resetRun);
  const { startRun, stopRun } = useRunSimulation();

  const architecture = useMemo(() => referenceArchitectureFor(designId), [designId]);
  const designChallenge = useMemo(() => challengeOrFallback(designId), [designId]);
  const running = status === "running";

  const config = useMemo<SimulationConfig>(
    () => ({
      requirements: {
        targetUsers: settings.targetUsers,
        requestsPerUserPerSec: settings.requestsPerUserPerSec,
        readRatio: settings.readRatio,
        staticRatio: settings.staticRatio,
        workingSetGb: designChallenge.requirements.workingSetGb,
        dataSizeGb: designChallenge.requirements.dataSizeGb,
        latencyP95Ms: settings.latencyP95Ms,
        maxErrorRatio: designChallenge.requirements.maxErrorRatio,
        availabilityRatio: designChallenge.requirements.availabilityRatio ?? 0.99,
        monthlyBudgetUsd: settings.monthlyBudgetUsd,
      },
      loadProfile: [
        { durationSec: 40, fromUsers: 0, toUsers: settings.targetUsers * 2 },
        { durationSec: 25, fromUsers: settings.targetUsers * 2, toUsers: settings.targetUsers * 2 },
      ],
    }),
    [designChallenge.requirements, settings],
  );

  const score = useMemo(
    () =>
      result
        ? scoreAttempt({
            requirements: config.requirements,
            maxUsersSustained: result.maxUsersSustained,
            monthlyCostUsd: result.monthlyCostUsd,
            ...(result.availabilityRatio === undefined
              ? {}
              : { availabilityRatio: result.availabilityRatio }),
          })
        : null,
    [config.requirements, result],
  );

  const patch = useCallback(
    (key: keyof SandboxSettings, value: number) => {
      setSettings((current) => ({ ...current, [key]: value }));

      if (!running) {
        resetRun();
      }
    },
    [resetRun, running],
  );

  const handleDesignChange = useCallback(
    (id: string) => {
      setDesignId(id);

      if (!running) {
        resetRun();
      }
    },
    [resetRun, running],
  );

  const handleRun = useCallback(() => {
    resetRun();
    startRun(architecture, config, 2);
  }, [architecture, config, resetRun, startRun]);

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 sm:px-6">
      <PageMeta
        title="Sandbox — ScaleLab"
        description="Stress-test a reference architecture with custom traffic, latency, and budget targets in the ScaleLab sandbox."
        path="/sandbox"
      />

      <div className="flex flex-wrap items-center gap-2 border-b bg-card/40 py-2.5">
        <Badge variant="outline" className="gap-1.5 font-mono text-[10px] uppercase">
          <FlaskConical className="size-3" aria-hidden="true" />
          Sandbox
        </Badge>
        <h1 className="text-sm font-medium">Arbitrary load</h1>
        <Badge variant="outline" className="ml-auto font-mono">
          {status}
        </Badge>
        {running ? (
          <Button type="button" variant="destructive" size="sm" onClick={stopRun}>
            <Square />
            Stop
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={handleRun}>
            <Play />
            Run sandbox
          </Button>
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
        <SandboxSidebar
          designId={designId}
          settings={settings}
          running={running}
          result={result}
          score={score}
          onDesignChange={handleDesignChange}
          onPatch={patch}
        />

        <div className="flex min-h-0 flex-col">
          <div className="border-b py-2 text-xs text-muted-foreground">
            {step
              ? `T+${step.timeSec.toFixed(0)}s · ${Math.round(step.metrics.users)} users · ${Math.round(step.metrics.offeredRps)} rps offered`
              : "Adjust the load and run the sandbox."}
          </div>
          <div className="flex-1">
            <LiveMetricsPanel p95SloMs={settings.latencyP95Ms} maxErrorRatio={0.01} />
          </div>
        </div>
      </div>
    </div>
  );
}
