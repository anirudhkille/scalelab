import { Line, LineChart, ReferenceLine, ResponsiveContainer, YAxis } from "recharts";

const CHART_MARGIN = { top: 2, right: 2, bottom: 0, left: 0 };
const Y_DOMAIN = [0, "auto"] as const;

export type MetricSeries = {
  readonly key: string;
  readonly color: string;
  readonly label: string;
};

type MetricChartProps = {
  readonly title: string;
  readonly value: string;
  readonly data: readonly Record<string, number>[];
  readonly series: readonly MetricSeries[];
  readonly slo?: {
    readonly value: number;
    readonly label: string;
  };
};

export function MetricChart({ title, value, data, series, slo }: MetricChartProps) {
  return (
    <div className="min-w-0 rounded-lg border border-border/70 bg-background/45 px-2.5 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
          {title}
        </p>
        <p className="truncate font-mono text-[11px] text-foreground">{value}</p>
      </div>

      <div
        className="mt-1 h-14"
        role="img"
        aria-label={`${title}: ${value}${slo ? `. Target ${slo.label}.` : ""}`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={CHART_MARGIN}>
            <YAxis hide domain={Y_DOMAIN} />
            {slo ? (
              <ReferenceLine
                y={slo.value}
                stroke="var(--health-warm)"
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
              />
            ) : null}
            {series.map((item) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.label}
                stroke={item.color}
                strokeWidth={1.6}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
