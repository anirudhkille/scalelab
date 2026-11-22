import { useCallback, useMemo, useState, type ChangeEvent } from "react";
import { FlaskConical, Play, Square } from "lucide-react";

import { challengeOrFallback, referenceArchitectureFor } from "@/features/challenges";
import { LiveMetricsPanel } from "@/features/playback";
import { StarRating, scoreAttempt } from "@/features/progress";
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
import { Input } from "@/shared/ui/input";
import { Separator } from "@/shared/ui/separator";

const DESIGN_OPTIONS = [
  { id: "personal-blog", label: "Personal blog" },
  { id: "url-shortener", label: "URL shortener" },
  { id: "photo-feed", label: "Photo feed" },
  { id: "chat-notifications", label: "Chat / notifications" },
  { id: "flash-sale", label: "Flash sale" },
] as const;

type SandboxSettings = {
  readonly targetUsers: number;
  readonly requestsPerUserPerSec: number;
  readonly readRatio: number;
  readonly staticRatio: number;
  readonly latencyP95Ms: number;
  readonly monthlyBudgetUsd: number;
};

const DEFAULTS: SandboxSettings = {
  targetUsers: 500,
  requestsPerUserPerSec: 2,
  readRatio: 0.8,
  staticRatio: 0.2,
  latencyP95Ms: 250,
  monthlyBudgetUsd: 1_000,
};

function SandboxSlider({
  id,
  label,
  value,
  min,
  max,
  step,
  suffix,
  disabled,
  onChange,
}: {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly suffix?: string;
  readonly disabled?: boolean;
  readonly onChange: (value: number) => void;
}) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => onChange(Number(event.target.value)),
    [onChange],
  );

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-xs font-medium">
          {label}
        </label>
        <span className="font-mono text-xs text-muted-foreground">
          {value.toLocaleString("en-US")}
          {suffix}
        </span>
      </div>
      <Input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        className="h-1.5 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
        onChange={handleChange}
      />
    </div>
  );
}

export function SandboxPage() {
  const [designId, setDesignId] = useState<string>(DESIGN_OPTIONS[0].id);
  const [settings, setSettings] = useState<SandboxSettings>(DEFAULTS);
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
    (event: ChangeEvent<HTMLSelectElement>) => {
      setDesignId(event.target.value);

      if (!running) {
        resetRun();
      }
    },
    [resetRun, running],
  );
  const handleUsersChange = useCallback((value: number) => patch("targetUsers", value), [patch]);
  const handleRequestsChange = useCallback(
    (value: number) => patch("requestsPerUserPerSec", value),
    [patch],
  );
  const handleReadChange = useCallback((value: number) => patch("readRatio", value / 100), [patch]);
  const handleStaticChange = useCallback(
    (value: number) => patch("staticRatio", value / 100),
    [patch],
  );
  const handleLatencyChange = useCallback((value: number) => patch("latencyP95Ms", value), [patch]);
  const handleBudgetChange = useCallback(
    (value: number) => patch("monthlyBudgetUsd", value),
    [patch],
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
        <aside className="space-y-4 overflow-y-auto border-b p-4 lg:border-r lg:border-b-0">
          <div className="space-y-1.5">
            <label htmlFor="sandbox-design" className="text-xs font-medium">
              Base design
            </label>
            <select
              id="sandbox-design"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={designId}
              disabled={running}
              onChange={handleDesignChange}
            >
              {DESIGN_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <Separator />

          <SandboxSlider
            id="sandbox-users"
            label="Target users"
            value={settings.targetUsers}
            min={50}
            max={5_000}
            step={50}
            disabled={running}
            onChange={handleUsersChange}
          />
          <SandboxSlider
            id="sandbox-rps"
            label="Requests / user / sec"
            value={settings.requestsPerUserPerSec}
            min={0.2}
            max={8}
            step={0.2}
            suffix=" rps"
            disabled={running}
            onChange={handleRequestsChange}
          />
          <SandboxSlider
            id="sandbox-read"
            label="Read share"
            value={Math.round(settings.readRatio * 100)}
            min={0}
            max={100}
            step={5}
            suffix="%"
            disabled={running}
            onChange={handleReadChange}
          />
          <SandboxSlider
            id="sandbox-static"
            label="Static share"
            value={Math.round(settings.staticRatio * 100)}
            min={0}
            max={100}
            step={5}
            suffix="%"
            disabled={running}
            onChange={handleStaticChange}
          />
          <SandboxSlider
            id="sandbox-latency"
            label="p95 SLO"
            value={settings.latencyP95Ms}
            min={50}
            max={1_000}
            step={25}
            suffix=" ms"
            disabled={running}
            onChange={handleLatencyChange}
          />
          <SandboxSlider
            id="sandbox-budget"
            label="Monthly budget"
            value={settings.monthlyBudgetUsd}
            min={100}
            max={10_000}
            step={100}
            suffix=" USD"
            disabled={running}
            onChange={handleBudgetChange}
          />

          <p className="rounded-lg border border-border/70 bg-muted/25 p-3 text-[11px] leading-relaxed text-muted-foreground">
            The sandbox runs the selected reference design against 2× your target users. Change any
            input and run again — nothing is saved to progress.
          </p>

          {result && score ? (
            <div className="space-y-2 rounded-lg border border-border/70 p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">
                  {result.outcome.status === "passed" ? "Passed" : "Failed"} at{" "}
                  {result.maxUsersSustained.toLocaleString("en-US")} users
                </p>
                <StarRating stars={score.stars} />
              </div>
              <p className="font-mono text-muted-foreground">
                ${Math.round(result.monthlyCostUsd)}/mo ·{" "}
                {result.availabilityRatio === undefined
                  ? "availability n/a"
                  : `${(result.availabilityRatio * 100).toFixed(2)}% available`}
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={score.sloMet ? "secondary" : "destructive"}>
                  {score.sloMet ? "Target met" : "Target missed"}
                </Badge>
                <Badge variant={score.withinBudget ? "secondary" : "destructive"}>
                  {score.withinBudget ? "In budget" : "Over budget"}
                </Badge>
                <Badge variant={score.availabilityMet ? "secondary" : "destructive"}>
                  {score.availabilityMet ? "Availability met" : "Availability missed"}
                </Badge>
              </div>
            </div>
          ) : null}
        </aside>

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
