import { useCallback } from "react";
import { GitCompareArrows, RotateCcw } from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

import type { AttemptRecord } from "../schema";
import { StarRating } from "./star-rating";

const NUMBER_FORMAT = new Intl.NumberFormat("en-US");
const MONEY_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

type AttemptRowProps = {
  readonly attempt: AttemptRecord;
  readonly previous?: AttemptRecord;
  readonly onCompare: (current: AttemptRecord, previous: AttemptRecord) => void;
  readonly onRestore: (attempt: AttemptRecord) => void;
};

export function AttemptRow({ attempt, previous, onCompare, onRestore }: AttemptRowProps) {
  const handleCompare = useCallback(() => {
    if (previous) {
      onCompare(attempt, previous);
    }
  }, [attempt, onCompare, previous]);

  const handleRestore = useCallback(() => {
    onRestore(attempt);
  }, [attempt, onRestore]);

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5 text-sm">
      <StarRating stars={attempt.stars} />
      <span className="font-mono text-xs text-muted-foreground">
        {DATE_FORMAT.format(attempt.timestamp)}
      </span>
      <span className="font-mono text-xs">
        {NUMBER_FORMAT.format(Math.round(attempt.maxUsersSustained))} users
      </span>
      <span className="font-mono text-xs text-muted-foreground">
        {MONEY_FORMAT.format(attempt.costUsd)}/mo
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        <Badge variant={attempt.sloMet ? "secondary" : "destructive"}>
          {attempt.sloMet ? "SLO met" : "SLO missed"}
        </Badge>
        <Badge variant={attempt.withinBudget ? "secondary" : "destructive"}>
          {attempt.withinBudget ? "In budget" : "Over budget"}
        </Badge>
        {previous ? (
          <Button variant="ghost" size="sm" onClick={handleCompare}>
            <GitCompareArrows data-icon="inline-start" />
            Compare
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={handleRestore}>
          <RotateCcw data-icon="inline-start" />
          Restore
        </Button>
      </div>
      {attempt.failureSummary === undefined ? null : (
        <p className="w-full text-xs text-muted-foreground">{attempt.failureSummary}</p>
      )}
    </li>
  );
}
