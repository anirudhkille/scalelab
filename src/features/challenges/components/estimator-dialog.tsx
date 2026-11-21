import { useMemo, useState } from "react";
import { Calculator, Clock3 } from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Separator } from "@/shared/ui/separator";

import { ESTIMATOR_ASSUMPTIONS, estimateLoad, type EstimatorInput } from "../estimate";
import type { Challenge } from "../schema";

const NUMBER_FORMAT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const COMPACT_FORMAT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatNumber(value: number): string {
  return NUMBER_FORMAT.format(value);
}

function formatCompact(value: number): string {
  return COMPACT_FORMAT.format(value);
}

function formatGb(value: number): string {
  if (value >= 1024) {
    return `${formatNumber(value / 1024)} TB`;
  }

  return `${formatNumber(value)} GB`;
}

function formatBandwidth(mbps: number): string {
  if (mbps >= 1024) {
    return `${formatNumber(mbps / 1024)} Gbps`;
  }

  return `${formatNumber(mbps)} Mbps`;
}

function ratioCopy(estimate: number, actual: number): string {
  if (actual <= 0 || estimate <= 0) {
    return "Add a target to compare";
  }

  const factor = estimate / actual;
  if (factor >= 0.75 && factor <= 1.5) {
    return `Within ${formatNumber(factor)}× of the challenge target`;
  }

  return `${formatNumber(factor)}× the challenge target`;
}

type NumberFieldProps = {
  readonly label: string;
  readonly value: number;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly suffix?: string;
  readonly onChange: (value: number) => void;
};

function NumberField({ label, value, min, max, step, suffix, onChange }: NumberFieldProps) {
  return (
    <label className="space-y-1.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step ?? 1}
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => onChange(Number(event.target.value))}
          className={suffix ? "pr-12" : undefined}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center font-mono text-[10px] text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}

function ResultCard({
  label,
  value,
  detail,
}: {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/25 p-3">
      <p className="text-[10px] tracking-wider text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 font-mono text-lg">{value}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}

export function EstimatorDialog({ challenge }: { readonly challenge: Challenge }) {
  const requirements = challenge.requirements;
  const [input, setInput] = useState<EstimatorInput>(() => ({
    users: requirements.targetUsers,
    requestsPerUserPerSec: requirements.requestsPerUserPerSec,
    peakToAverageRatio: ESTIMATOR_ASSUMPTIONS.peakToAverageRatio,
    readRatio: requirements.readRatio,
    responseSizeKb: ESTIMATOR_ASSUMPTIONS.responseSizeKb,
    recordSizeKb: ESTIMATOR_ASSUMPTIONS.recordSizeKb,
  }));

  const estimate = useMemo(() => estimateLoad(input), [input]);
  const challengePeakQps = requirements.targetUsers * requirements.requestsPerUserPerSec;
  const storageFactor =
    requirements.dataSizeGb > 0 ? estimate.annualStorageGb / requirements.dataSizeGb : 0;

  const update = <Key extends keyof EstimatorInput>(key: Key, value: EstimatorInput[Key]) => {
    setInput((current) => ({ ...current, [key]: value }));
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <Calculator />
        Estimate
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Back-of-envelope estimate</DialogTitle>
          <DialogDescription>
            Work out the load before you pick components. Start with users × requests, then divide
            by the seconds in a day.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/25 px-3 py-2 font-mono text-[11px] text-muted-foreground">
          <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
          {formatCompact(input.users)} users × {formatNumber(input.requestsPerUserPerSec)} req/s ={" "}
          {formatCompact(estimate.averageQps)} avg QPS · × {formatNumber(input.peakToAverageRatio)}{" "}
          peak = {formatCompact(estimate.peakQps)} QPS
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumberField
            label="Users at peak"
            value={input.users}
            min={0}
            onChange={(value) => update("users", value)}
          />
          <NumberField
            label="Requests / user / sec"
            value={input.requestsPerUserPerSec}
            min={0}
            step={0.1}
            onChange={(value) => update("requestsPerUserPerSec", value)}
          />
          <NumberField
            label="Peak-to-average"
            value={input.peakToAverageRatio}
            min={1}
            step={0.5}
            suffix="×"
            onChange={(value) => update("peakToAverageRatio", value)}
          />
          <NumberField
            label="Read share"
            value={Math.round(input.readRatio * 100)}
            min={0}
            max={100}
            suffix="%"
            onChange={(value) => update("readRatio", value / 100)}
          />
          <NumberField
            label="Response size"
            value={input.responseSizeKb}
            min={0}
            step={0.5}
            suffix="KB"
            onChange={(value) => update("responseSizeKb", value)}
          />
          <NumberField
            label="Stored record"
            value={input.recordSizeKb}
            min={0}
            step={0.5}
            suffix="KB"
            onChange={(value) => update("recordSizeKb", value)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <ResultCard
            label="Peak throughput"
            value={`${formatCompact(estimate.peakQps)} QPS`}
            detail={`${formatCompact(estimate.writeQps * input.peakToAverageRatio)} writes/s · ${formatCompact(estimate.readQps * input.peakToAverageRatio)} reads/s`}
          />
          <ResultCard
            label="Per day"
            value={`${formatCompact(estimate.dailyRequests)} req`}
            detail={`${formatCompact(estimate.dailyWriteGb)} GB written · 86,400 seconds/day`}
          />
          <ResultCard
            label="Storage / year"
            value={formatGb(estimate.annualStorageGb)}
            detail={`${formatCompact(estimate.dailyWriteGb)} GB/day × 365 days`}
          />
          <ResultCard
            label="Egress / year"
            value={formatCompact(
              (estimate.averageBandwidthMbps * ESTIMATOR_ASSUMPTIONS.secondsPerDay * 365) /
                (8 * 1024 * 1024),
            )}
            detail="TB of response bytes across the year"
          />
          <ResultCard
            label="Bandwidth at peak"
            value={formatBandwidth(estimate.peakBandwidthMbps)}
            detail={`${formatBandwidth(estimate.averageBandwidthMbps)} average`}
          />
          <ResultCard
            label="Daily budget"
            value={`$${formatNumber(requirements.monthlyBudgetUsd / 30)}`}
            detail={`$${formatNumber(requirements.monthlyBudgetUsd)}/mo challenge cap`}
          />
        </div>

        <Separator />

        <section className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wider uppercase">
            How your estimate compares
          </h3>
          <ul className="space-y-2 text-xs">
            <li className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2">
              <span className="text-muted-foreground">Peak QPS</span>
              <span className="font-mono">
                {formatCompact(estimate.peakQps)} vs {formatCompact(challengePeakQps)}
              </span>
              <Badge variant="outline" className="shrink-0 font-normal">
                {ratioCopy(estimate.peakQps, challengePeakQps)}
              </Badge>
            </li>
            <li className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2">
              <span className="text-muted-foreground">Dataset growth / yr</span>
              <span className="font-mono">
                {formatGb(estimate.annualStorageGb)} vs {formatGb(requirements.dataSizeGb)}
              </span>
              <Badge variant="outline" className="shrink-0 font-normal">
                {storageFactor > 0 ? `${formatNumber(storageFactor)}× the dataset` : "No dataset"}
              </Badge>
            </li>
            <li className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2">
              <span className="text-muted-foreground">Latency budget</span>
              <span className="font-mono">{requirements.latencyP95Ms} ms p95</span>
              <Badge variant="outline" className="shrink-0 font-normal">
                {estimate.peakBandwidthMbps > 0
                  ? `${formatNumber(800 / estimate.peakBandwidthMbps)} ms / 100 KB`
                  : "No transfer"}
              </Badge>
            </li>
          </ul>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            The simulator uses the challenge target of {formatCompact(challengePeakQps)} peak QPS.
            Change the inputs to see how sensitive the design is to user count, request size, and
            write share.
          </p>
        </section>
      </DialogContent>
    </Dialog>
  );
}
