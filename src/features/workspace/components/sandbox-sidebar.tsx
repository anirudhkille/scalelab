import { useCallback, type ChangeEvent } from "react";

import type { AttemptScore } from "@/features/progress";
import { StarRating } from "@/features/progress";
import type { RunResult } from "@/features/simulation";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Separator } from "@/shared/ui/separator";

import { SANDBOX_DESIGNS, type SandboxSettings } from "../model/sandbox-config";

type SandboxSidebarProps = {
  readonly designId: string;
  readonly settings: SandboxSettings;
  readonly running: boolean;
  readonly result: RunResult | null;
  readonly score: AttemptScore | null;
  readonly onDesignChange: (id: string) => void;
  readonly onPatch: (key: keyof SandboxSettings, value: number) => void;
};

function Slider({
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

export function SandboxSidebar({
  designId,
  settings,
  running,
  result,
  score,
  onDesignChange,
  onPatch,
}: SandboxSidebarProps) {
  const handleDesignChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => onDesignChange(event.target.value),
    [onDesignChange],
  );
  const handleUsers = useCallback((value: number) => onPatch("targetUsers", value), [onPatch]);
  const handleRequests = useCallback(
    (value: number) => onPatch("requestsPerUserPerSec", value),
    [onPatch],
  );
  const handleRead = useCallback((value: number) => onPatch("readRatio", value / 100), [onPatch]);
  const handleStatic = useCallback(
    (value: number) => onPatch("staticRatio", value / 100),
    [onPatch],
  );
  const handleLatency = useCallback((value: number) => onPatch("latencyP95Ms", value), [onPatch]);
  const handleBudget = useCallback(
    (value: number) => onPatch("monthlyBudgetUsd", value),
    [onPatch],
  );

  return (
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
          {SANDBOX_DESIGNS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <Separator />

      <Slider
        id="sandbox-users"
        label="Target users"
        value={settings.targetUsers}
        min={50}
        max={5_000}
        step={50}
        disabled={running}
        onChange={handleUsers}
      />
      <Slider
        id="sandbox-rps"
        label="Requests / user / sec"
        value={settings.requestsPerUserPerSec}
        min={0.2}
        max={8}
        step={0.2}
        suffix=" rps"
        disabled={running}
        onChange={handleRequests}
      />
      <Slider
        id="sandbox-read"
        label="Read share"
        value={Math.round(settings.readRatio * 100)}
        min={0}
        max={100}
        step={5}
        suffix="%"
        disabled={running}
        onChange={handleRead}
      />
      <Slider
        id="sandbox-static"
        label="Static share"
        value={Math.round(settings.staticRatio * 100)}
        min={0}
        max={100}
        step={5}
        suffix="%"
        disabled={running}
        onChange={handleStatic}
      />
      <Slider
        id="sandbox-latency"
        label="p95 SLO"
        value={settings.latencyP95Ms}
        min={50}
        max={1_000}
        step={25}
        suffix=" ms"
        disabled={running}
        onChange={handleLatency}
      />
      <Slider
        id="sandbox-budget"
        label="Monthly budget"
        value={settings.monthlyBudgetUsd}
        min={100}
        max={10_000}
        step={100}
        suffix=" USD"
        disabled={running}
        onChange={handleBudget}
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
  );
}
