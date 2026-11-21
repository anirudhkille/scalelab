import { useMemo } from "react";

import { Badge } from "@/shared/ui/badge";

import {
  selectRunError,
  selectRunHistory,
  selectRunStatus,
  selectRunStep,
  useRunStore,
  type RunStatus,
} from "@/features/simulation";

import { MetricChart, type MetricSeries } from "./metric-chart";

const USER_SERIES: readonly MetricSeries[] = [
  { key: "users", label: "Users", color: "var(--chart-1)" },
];
const THROUGHPUT_SERIES: readonly MetricSeries[] = [
  { key: "servedRps", label: "Served", color: "var(--health-ok)" },
  { key: "droppedRps", label: "Dropped", color: "var(--health-fail)" },
];
const P95_SERIES: readonly MetricSeries[] = [
  { key: "p95LatencyMs", label: "p95", color: "var(--chart-3)" },
];
const ERROR_SERIES: readonly MetricSeries[] = [
  { key: "errorPct", label: "Errors", color: "var(--chart-4)" },
];

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

type LiveMetricsPanelProps = {
  readonly p95SloMs: number;
  readonly maxErrorRatio: number;
};

function formatInteger(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function LiveMetricsPanel({ p95SloMs, maxErrorRatio }: LiveMetricsPanelProps) {
  const status = useRunStore(selectRunStatus);
  const step = useRunStore(selectRunStep);
  const history = useRunStore(selectRunHistory);
  const error = useRunStore(selectRunError);

  const chartData = useMemo(
    () =>
      history.map((sample) => ({
        ...sample,
        errorPct: sample.errorRatio * 100,
      })),
    [history],
  );
  const last = chartData[chartData.length - 1];
  const p95Slo = useMemo(() => ({ value: p95SloMs, label: `${p95SloMs} ms` }), [p95SloMs]);
  const errorSlo = useMemo(
    () => ({
      value: maxErrorRatio * 100,
      label: `${(maxErrorRatio * 100).toFixed(2)}%`,
    }),
    [maxErrorRatio],
  );

  return (
    <section className="shrink-0 border-t border-border/70 bg-card/35 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          Live load
        </p>
        <Badge variant="outline" className={STATUS_CLASS[status]}>
          {STATUS_LABEL[status]}
        </Badge>
        <span className="font-mono text-[10px] text-muted-foreground">
          T+{(step?.timeSec ?? 0).toFixed(1)}s
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          users {formatInteger(last?.users ?? 0)}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          peak util {Math.round((last?.maxUtilizationRatio ?? 0) * 100)}%
        </span>
        {error ? (
          <span className="max-w-full truncate font-mono text-[10px] text-health-fail">
            {error}
          </span>
        ) : null}
      </div>

      {history.length === 0 ? (
        <p className="mt-2 rounded-lg border border-dashed border-border/70 px-3 py-3 text-center text-[11px] text-muted-foreground">
          Run a load test to stream users, throughput, latency, and errors here.
        </p>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-2 xl:grid-cols-4">
          <MetricChart
            title="Users"
            value={`${formatInteger(last?.users ?? 0)} users`}
            data={chartData}
            series={USER_SERIES}
          />
          <MetricChart
            title="Throughput"
            value={`${formatInteger(last?.servedRps ?? 0)} / ${formatInteger(last?.droppedRps ?? 0)} rps`}
            data={chartData}
            series={THROUGHPUT_SERIES}
          />
          <MetricChart
            title="p95 latency"
            value={`${Math.round(last?.p95LatencyMs ?? 0)} ms`}
            data={chartData}
            series={P95_SERIES}
            slo={p95Slo}
          />
          <MetricChart
            title="Errors"
            value={`${(last?.errorPct ?? 0).toFixed(2)}%`}
            data={chartData}
            series={ERROR_SERIES}
            slo={errorSlo}
          />
        </div>
      )}
    </section>
  );
}
