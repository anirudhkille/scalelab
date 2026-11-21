import { useCallback } from "react";
import { GitCompareArrows, RotateCcw } from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

import type { AttemptRecord } from "../schema";
import { StarRating } from "./star-rating";

const NUMBER_FORMAT = new Intl.NumberFormat("en-US");
const MONEY_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

type AttemptCompareDialogProps = {
  readonly open: boolean;
  readonly challengeTitle: string;
  readonly current: AttemptRecord;
  readonly previous: AttemptRecord;
  readonly onOpenChange: (open: boolean) => void;
  readonly onRestorePrevious: (attempt: AttemptRecord) => void;
};

function CompareRow({
  label,
  current,
  previous,
}: {
  readonly label: string;
  readonly current: string;
  readonly previous: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border/70 py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-20 text-right font-mono text-xs">{previous}</dd>
      <dd className="min-w-20 text-right font-mono text-xs font-medium">{current}</dd>
    </div>
  );
}

export function AttemptCompareDialog({
  open,
  challengeTitle,
  current,
  previous,
  onOpenChange,
  onRestorePrevious,
}: AttemptCompareDialogProps) {
  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleRestore = useCallback(() => {
    onRestorePrevious(previous);
  }, [onRestorePrevious, previous]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <GitCompareArrows className="size-4" aria-hidden="true" />
            </span>
            <Badge variant="outline">Attempt compare</Badge>
          </div>
          <DialogTitle>What changed?</DialogTitle>
          <DialogDescription>{challengeTitle}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-[1fr_auto_auto] gap-3 text-[10px] tracking-wider text-muted-foreground uppercase">
          <span />
          <span className="text-right">Previous</span>
          <span className="text-right">Current</span>
        </div>

        <dl>
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-border/70 py-2">
            <dt className="text-sm text-muted-foreground">Stars</dt>
            <dd className="flex justify-end">
              <StarRating stars={previous.stars} />
            </dd>
            <dd className="flex justify-end">
              <StarRating stars={current.stars} />
            </dd>
          </div>
          <CompareRow
            label="Users held"
            previous={NUMBER_FORMAT.format(Math.round(previous.maxUsersSustained))}
            current={NUMBER_FORMAT.format(Math.round(current.maxUsersSustained))}
          />
          <CompareRow
            label="Monthly cost"
            previous={`${MONEY_FORMAT.format(previous.costUsd)}/mo`}
            current={`${MONEY_FORMAT.format(current.costUsd)}/mo`}
          />
          <CompareRow
            label="SLO"
            previous={previous.sloMet ? "Met" : "Missed"}
            current={current.sloMet ? "Met" : "Missed"}
          />
          <CompareRow
            label="Budget"
            previous={previous.withinBudget ? "In budget" : "Over"}
            current={current.withinBudget ? "In budget" : "Over"}
          />
        </dl>

        <p className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Restoring replaces your current design with the architecture saved before this run. Your
          attempt history stays intact.
        </p>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose}>
            Keep current
          </Button>
          <Button size="sm" onClick={handleRestore}>
            <RotateCcw data-icon="inline-start" />
            Restore previous design
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
