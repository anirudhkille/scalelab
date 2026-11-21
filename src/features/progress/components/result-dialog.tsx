import { CheckCircle2, CircleDollarSign, Gauge, RotateCcw, Users } from "lucide-react";

import type { ChallengeRequirements } from "@/features/challenges";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

import type { AttemptScore } from "../scoring";
import { StarRating } from "./star-rating";

const NUMBER_FORMAT = new Intl.NumberFormat("en-US");
const MONEY_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const RESULT_COPY: Record<AttemptScore["stars"], { title: string; body: string }> = {
  0: {
    title: "Good effort",
    body: "This run did not reach the target, but the design is ready for another pass.",
  },
  1: {
    title: "It held, but the bill is heavy",
    body: "The target load survived. Trim the design or right-size components before calling it done.",
  },
  2: {
    title: "Stable and inside budget",
    body: "The target load survived within the monthly budget. Can it handle the next wave?",
  },
  3: {
    title: "Stable with headroom",
    body: "The target load survived, stayed inside budget, and kept twice the target load alive.",
  },
};

type ResultDialogProps = {
  readonly open: boolean;
  readonly challengeTitle: string;
  readonly requirements: ChallengeRequirements;
  readonly score: AttemptScore;
  readonly maxUsersSustained: number;
  readonly costUsd: number;
  readonly onOpenChange: (open: boolean) => void;
  readonly onRunAgain: () => void;
  readonly onEditDesign: () => void;
};

export function ResultDialog({
  open,
  challengeTitle,
  requirements,
  score,
  maxUsersSustained,
  costUsd,
  onOpenChange,
  onRunAgain,
  onEditDesign,
}: ResultDialogProps) {
  const copy = RESULT_COPY[score.stars];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-health-ok/15 text-health-ok">
              <CheckCircle2 className="size-4" />
            </span>
            <Badge variant="outline" className="font-mono text-[10px] tracking-wider uppercase">
              Run passed
            </Badge>
          </div>
          <DialogTitle className="mt-1 text-xl">{copy.title}</DialogTitle>
          <DialogDescription>
            {challengeTitle} survived the load profile. {copy.body}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
                Your score
              </p>
              <StarRating stars={score.stars} className="mt-2" />
            </div>
            <p className="text-right text-xs text-muted-foreground">
              {score.stars}/3 stars
              <br />
              {score.stars === 3 ? "Best possible" : "Keep tuning for more"}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat
            icon={<Users className="size-3.5" />}
            label="Users held"
            value={NUMBER_FORMAT.format(maxUsersSustained)}
          />
          <Stat
            icon={<Gauge className="size-3.5" />}
            label="Target"
            value={NUMBER_FORMAT.format(requirements.targetUsers)}
          />
          <Stat
            icon={<CircleDollarSign className="size-3.5" />}
            label="Monthly cost"
            value={MONEY_FORMAT.format(costUsd)}
          />
          <Stat
            icon={<CircleDollarSign className="size-3.5" />}
            label="Budget"
            value={MONEY_FORMAT.format(requirements.monthlyBudgetUsd)}
          />
        </dl>

        <div className="flex flex-wrap gap-2">
          <Badge variant={score.sloMet ? "secondary" : "outline"}>
            {score.sloMet ? "SLO target met" : "SLO target missed"}
          </Badge>
          <Badge variant={score.withinBudget ? "secondary" : "outline"}>
            {score.withinBudget ? "Inside budget" : "Over budget"}
          </Badge>
          <Badge variant={score.headroomMet ? "secondary" : "outline"}>
            {score.headroomMet ? "2× headroom" : "No 2× headroom"}
          </Badge>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onEditDesign}>
            Edit design
          </Button>
          <Button onClick={onRunAgain}>
            <RotateCcw />
            Run again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="rounded-lg border bg-card px-2.5 py-2">
      <dt className="flex items-center gap-1 text-[10px] text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 truncate font-mono text-sm font-medium">{value}</dd>
    </div>
  );
}
