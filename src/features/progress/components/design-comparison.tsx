import { CircleDollarSign, GitCompareArrows } from "lucide-react";

import type { Architecture } from "@/features/architecture";
import { Badge } from "@/shared/ui/badge";

import { costBreakdownByComponent, designDiff } from "../design-comparison";

const MONEY_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const NUMBER_FORMAT = new Intl.NumberFormat("en-US");
const PERCENT_FORMAT = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 0,
});

type DesignComparisonProps = {
  readonly architecture: Architecture;
  readonly reference: Architecture;
  readonly maxUsersSustained: number;
  readonly targetUsers: number;
};

function deltaCopy(deltaUsd: number, deltaRatio: number): string {
  if (Math.abs(deltaUsd) < 1) {
    return "Costs the same as the reference";
  }

  if (deltaUsd > 0) {
    return `Costs ${PERCENT_FORMAT.format(deltaRatio)} more than the reference`;
  }

  return `Costs ${PERCENT_FORMAT.format(Math.abs(deltaRatio))} less than the reference`;
}

export function DesignComparison({
  architecture,
  reference,
  maxUsersSustained,
  targetUsers,
}: DesignComparisonProps) {
  const breakdown = costBreakdownByComponent(architecture);
  const diff = designDiff(architecture, reference);
  const maxCost = Math.max(1, ...breakdown.lines.map((line) => line.monthlyCostUsd));
  const headroomRatio = targetUsers > 0 ? maxUsersSustained / targetUsers : 1;

  return (
    <section aria-labelledby="design-comparison-heading" className="space-y-3">
      <div className="flex items-center gap-2">
        <GitCompareArrows className="size-4 text-muted-foreground" />
        <h3
          id="design-comparison-heading"
          className="text-xs font-semibold tracking-wider uppercase"
        >
          Your design vs the reference
        </h3>
      </div>

      <div className="rounded-xl border bg-muted/25 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={diff.deltaUsd > 0 ? "destructive" : "secondary"} className="font-normal">
            <CircleDollarSign data-icon="inline-start" />
            {deltaCopy(diff.deltaUsd, diff.deltaRatio)}
          </Badge>
          <Badge variant="outline" className="font-mono text-[10px]">
            {MONEY_FORMAT.format(diff.userTotalUsd)} vs{" "}
            {MONEY_FORMAT.format(diff.referenceTotalUsd)}/mo
          </Badge>
          <Badge variant="outline" className="font-mono text-[10px]">
            {NUMBER_FORMAT.format(maxUsersSustained)} users held · {headroomRatio.toFixed(1)}×
            target
          </Badge>
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {diff.added.map((item) => (
            <Badge key={`added-${item.kind}`} variant="outline" className="font-normal">
              +{item.count} {item.label}
            </Badge>
          ))}
          {diff.skipped.map((item) => (
            <Badge key={`skipped-${item.kind}`} variant="outline" className="font-normal">
              −{item.count} {item.label}
            </Badge>
          ))}
          {diff.added.length === 0 && diff.skipped.length === 0 ? (
            <span className="text-xs text-muted-foreground">
              Same component mix as the reference.
            </span>
          ) : null}
        </div>

        {diff.skipped.length > 0 ? (
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            The reference spends on{" "}
            {diff.skipped.map((item) => item.label.toLowerCase()).join(", ")}. If you passed without
            it, check that the next traffic wave still has headroom.
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border">
        <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
          <p className="text-[10px] tracking-wider text-muted-foreground uppercase">
            Cost breakdown
          </p>
          <p className="font-mono text-xs">{MONEY_FORMAT.format(breakdown.totalUsd)}/mo</p>
        </div>
        <ul className="divide-y">
          {breakdown.lines.map((line) => (
            <li key={line.kind} className="grid grid-cols-[1fr_auto] gap-x-3 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-xs">{line.label}</span>
                <span className="font-mono text-[10px] text-muted-foreground">×{line.count}</span>
              </div>
              <span className="text-right font-mono text-xs">
                {MONEY_FORMAT.format(line.monthlyCostUsd)}
              </span>
              <div className="col-span-2 mt-1 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/70"
                  style={{ width: `${(line.monthlyCostUsd / maxCost) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
