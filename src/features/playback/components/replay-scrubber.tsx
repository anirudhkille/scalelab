import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

import type { Architecture } from "@/features/architecture";
import type { NodeSnapshot, SimulationStep } from "@/features/simulation";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Slider } from "@/shared/ui/slider";

const NUMBER_FORMAT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const RATIO_FORMAT = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 0,
});
const SATURATION_THRESHOLD = 0.95;
const REPLAY_INTERVAL_MS = 200;

type ReplayScrubberProps = {
  readonly architecture: Architecture;
  readonly timeline: readonly SimulationStep[];
};

type SaturationPoint = {
  readonly timeSec: number;
  readonly nodeId: string;
  readonly label: string;
};

function nodeLabel(architecture: Architecture, nodeId: string): string {
  return architecture.nodes.find((node) => node.id === nodeId)?.label ?? nodeId;
}

function firstSaturation(
  architecture: Architecture,
  timeline: readonly SimulationStep[],
): SaturationPoint | null {
  for (const step of timeline) {
    for (const node of step.nodes) {
      if (node.utilizationRatio >= SATURATION_THRESHOLD || node.droppedRps > 0) {
        return {
          timeSec: step.timeSec,
          nodeId: node.nodeId,
          label: nodeLabel(architecture, node.nodeId),
        };
      }
    }
  }

  return null;
}

function frameTime(step: SimulationStep | undefined): string {
  return step ? `${step.timeSec.toFixed(1)}s` : "—";
}

function nodeRows(nodes: readonly NodeSnapshot[]): readonly NodeSnapshot[] {
  return nodes.toSorted((left, right) => right.utilizationRatio - left.utilizationRatio);
}

export function ReplayScrubber({ architecture, timeline }: ReplayScrubberProps) {
  const lastIndex = Math.max(0, timeline.length - 1);
  const [selection, setSelection] = useState({ length: timeline.length, index: lastIndex });
  const [playing, setPlaying] = useState(false);
  const selected =
    selection.length === timeline.length ? Math.min(selection.index, lastIndex) : lastIndex;
  const isPlaying = playing && selected < lastIndex;

  useEffect(() => {
    if (!playing) {
      return;
    }

    const timer = window.setInterval(() => {
      setSelection((current) => {
        if (current.length !== timeline.length) {
          return { length: timeline.length, index: lastIndex };
        }

        return {
          length: timeline.length,
          index: Math.min(lastIndex, current.index + 1),
        };
      });
    }, REPLAY_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [lastIndex, playing, timeline.length]);

  const saturation = useMemo(
    () => firstSaturation(architecture, timeline),
    [architecture, timeline],
  );
  const step = timeline[Math.min(selected, lastIndex)];
  const rows = useMemo(() => nodeRows(step?.nodes ?? []), [step]);

  if (timeline.length === 0) {
    return (
      <section className="rounded-xl border bg-muted/25 p-4 text-sm text-muted-foreground">
        No timeline was captured for this run.
      </section>
    );
  }

  return (
    <section aria-labelledby="replay-heading" className="rounded-xl border bg-card/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="replay-heading" className="text-xs font-semibold tracking-wider uppercase">
          Replay
        </h3>
        <Badge variant="outline" className="font-mono text-[10px]">
          {frameTime(step)} / {frameTime(timeline[lastIndex])}
        </Badge>
        {saturation ? (
          <Badge variant="outline" className="ml-auto border-health-warm/40 text-health-warm">
            First saturation: {saturation.label} at {saturation.timeSec.toFixed(1)}s
          </Badge>
        ) : (
          <Badge variant="outline" className="ml-auto text-muted-foreground">
            No saturation captured
          </Badge>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={isPlaying ? "Pause replay" : "Play replay"}
          onClick={() => {
            if (selected >= lastIndex) {
              setSelection({ length: timeline.length, index: 0 });
              setPlaying(true);
              return;
            }

            setPlaying((current) => !current);
          }}
        >
          {isPlaying ? <Pause /> : <Play />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Jump to start"
          onClick={() => {
            setPlaying(false);
            setSelection({ length: timeline.length, index: 0 });
          }}
        >
          <RotateCcw />
        </Button>
        <Slider
          className="min-w-0 flex-1"
          min={0}
          max={lastIndex}
          step={1}
          value={[selected]}
          aria-label="Replay timeline"
          onValueChange={(value) => {
            setPlaying(false);
            const next = Array.isArray(value) ? value[0] : value;
            setSelection({
              length: timeline.length,
              index: Math.max(0, Math.min(lastIndex, next ?? 0)),
            });
          }}
        />
        <span className="w-12 shrink-0 text-right font-mono text-[10px] text-muted-foreground">
          {Math.round((selected / Math.max(1, lastIndex)) * 100)}%
        </span>
      </div>

      {step ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <FrameMetric label="Users" value={NUMBER_FORMAT.format(step.metrics.users)} />
          <FrameMetric
            label="Offered"
            value={`${NUMBER_FORMAT.format(step.metrics.offeredRps)} rps`}
          />
          <FrameMetric
            label="Dropped"
            value={`${NUMBER_FORMAT.format(step.metrics.droppedRps)} rps`}
          />
          <FrameMetric
            label="p95"
            value={`${NUMBER_FORMAT.format(step.metrics.p95LatencyMs)} ms`}
          />
        </div>
      ) : null}

      <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-muted/80 text-[10px] tracking-wider text-muted-foreground uppercase backdrop-blur">
            <tr>
              <th className="px-2 py-1.5 font-medium">Component</th>
              <th className="px-2 py-1.5 text-right font-medium">Util</th>
              <th className="px-2 py-1.5 text-right font-medium">Queue</th>
              <th className="px-2 py-1.5 text-right font-medium">Dropped</th>
              <th className="px-2 py-1.5 text-right font-medium">Latency</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((node) => (
              <tr
                key={node.nodeId}
                className={
                  node.utilizationRatio >= SATURATION_THRESHOLD
                    ? "border-t border-border/60 bg-health-fail/5"
                    : "border-t border-border/60"
                }
              >
                <td className="px-2 py-1.5">{nodeLabel(architecture, node.nodeId)}</td>
                <td className="px-2 py-1.5 text-right font-mono">
                  {RATIO_FORMAT.format(node.utilizationRatio)}
                </td>
                <td className="px-2 py-1.5 text-right font-mono">
                  {NUMBER_FORMAT.format(node.queueDepth)}
                </td>
                <td className="px-2 py-1.5 text-right font-mono">
                  {NUMBER_FORMAT.format(node.droppedRps)}
                </td>
                <td className="px-2 py-1.5 text-right font-mono">
                  {NUMBER_FORMAT.format(node.latencyMs)} ms
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {saturation ? (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          Scrub to {saturation.timeSec.toFixed(1)}s to see {saturation.label} cross the saturation
          line before downstream nodes feel the backlog.
        </p>
      ) : null}
    </section>
  );
}

function FrameMetric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <p className="text-[10px] tracking-wider text-muted-foreground uppercase">{label}</p>
      <p className="mt-0.5 font-mono text-sm">{value}</p>
    </div>
  );
}
