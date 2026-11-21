import { useMemo } from "react";

import type { RunChartSample } from "@/features/simulation";

const WIDTH = 360;
const HEIGHT = 88;
const PAD = 6;

type P95SparklineProps = {
  readonly history: readonly RunChartSample[];
  readonly endTimeSec: number;
  readonly sloMs: number;
};

export function P95Sparkline({ history, endTimeSec, sloMs }: P95SparklineProps) {
  const chart = useMemo(() => {
    const startTimeSec = Math.max(0, endTimeSec - 10);
    const window = history.filter(
      (sample) => sample.timeSec >= startTimeSec && sample.timeSec <= endTimeSec,
    );
    const values = window.map((sample) => sample.p95LatencyMs);
    const maxValue = Math.max(sloMs, ...values, 1) * 1.15;
    const span = Math.max(endTimeSec - startTimeSec, 0.5);

    const toPoint = (timeSec: number, value: number) => {
      const x = PAD + ((timeSec - startTimeSec) / span) * (WIDTH - PAD * 2);
      const y = HEIGHT - PAD - (value / maxValue) * (HEIGHT - PAD * 2);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    };

    const sloY = HEIGHT - PAD - (sloMs / maxValue) * (HEIGHT - PAD * 2);

    return {
      points: window.map((sample) => toPoint(sample.timeSec, sample.p95LatencyMs)).join(" "),
      sloY: sloY.toFixed(2),
      hasData: window.length > 1,
      lastValue: values[values.length - 1] ?? 0,
    };
  }, [endTimeSec, history, sloMs]);

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between gap-3 text-[10px] tracking-wider text-muted-foreground uppercase">
        <span>p95 · last 10s</span>
        <span className="font-mono text-foreground">{Math.round(chart.lastValue)} ms</span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-20 w-full overflow-visible"
        role="img"
        aria-label={`p95 latency over the last 10 seconds, ending at ${Math.round(chart.lastValue)} milliseconds against a ${sloMs} millisecond SLO`}
      >
        <line
          x1={PAD}
          x2={WIDTH - PAD}
          y1={chart.sloY}
          y2={chart.sloY}
          stroke="var(--health-warm)"
          strokeDasharray="4 4"
          strokeWidth="1"
        />
        {chart.hasData ? (
          <polyline
            points={chart.points}
            fill="none"
            stroke="var(--health-fail)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        ) : null}
        <text
          x={PAD}
          y={Math.max(Number(chart.sloY) - 3, 8)}
          fill="var(--muted-foreground)"
          fontSize="8"
        >
          SLO {sloMs} ms
        </text>
      </svg>
    </div>
  );
}
