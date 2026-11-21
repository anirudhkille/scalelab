import { ArrowRight, CircleDollarSign, Gauge, Users } from "lucide-react";
import { Link } from "react-router";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

import { difficultyLabel } from "../difficulty";
import type { Challenge } from "../schema";

type ChallengeCardProps = {
  readonly challenge: Challenge;
};

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  const requirements = challenge.requirements;

  return (
    <article className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-ring/50">
      <div className="flex items-start justify-between gap-3">
        <Badge variant="outline" className="font-mono text-[10px] tracking-wider uppercase">
          {difficultyLabel(challenge.difficulty)}
        </Badge>
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
          Level {challenge.difficulty}
        </span>
      </div>

      <h3 className="mt-3 text-lg font-semibold tracking-tight">{challenge.title}</h3>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {challenge.concepts.slice(0, 3).map((concept) => (
          <span
            key={concept}
            className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
          >
            {concept}
          </span>
        ))}
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border/70 pt-3 font-mono text-[10px] text-muted-foreground">
        <div>
          <dt className="flex items-center gap-1">
            <Users className="size-3" aria-hidden="true" />
            Users
          </dt>
          <dd className="mt-0.5 text-foreground">
            {requirements.targetUsers.toLocaleString("en-US")}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1">
            <Gauge className="size-3" aria-hidden="true" />
            p95
          </dt>
          <dd className="mt-0.5 text-foreground">{requirements.latencyP95Ms} ms</dd>
        </div>
        <div>
          <dt className="flex items-center gap-1">
            <CircleDollarSign className="size-3" aria-hidden="true" />
            Budget
          </dt>
          <dd className="mt-0.5 text-foreground">
            ${requirements.monthlyBudgetUsd.toLocaleString("en-US")}
          </dd>
        </div>
      </dl>

      <Button
        nativeButton={false}
        render={<Link to={`/challenge/${challenge.id}`} />}
        variant="outline"
        size="sm"
        className="mt-4 w-full justify-between group-hover:bg-muted/60"
      >
        Open challenge
        <ArrowRight />
      </Button>
    </article>
  );
}
