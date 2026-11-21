import { useMemo } from "react";
import { Link } from "react-router";
import { ArrowRight, LineChart } from "lucide-react";

import { CHALLENGES, difficultyLabel } from "@/features/challenges";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

import { StarRating } from "../components/star-rating";
import { bestStarsForChallenge, selectAttempts, useAttemptStore } from "../store/attempt-store";

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

const MAX_TOTAL_STARS = CHALLENGES.length * 3;

export function ProgressPage() {
  const attempts = useAttemptStore(selectAttempts);

  const groups = useMemo(
    () =>
      CHALLENGES.map((challenge) => {
        const challengeAttempts = attempts.filter(
          (attempt) => attempt.challengeId === challenge.id,
        );
        return {
          challenge,
          attempts: challengeAttempts.slice(0, 5),
          total: challengeAttempts.length,
          bestStars: bestStarsForChallenge(challengeAttempts),
        };
      }).filter((group) => group.total > 0),
    [attempts],
  );

  const totalStars = useMemo(
    () =>
      CHALLENGES.reduce((total, challenge) => {
        const challengeAttempts = attempts.filter(
          (attempt) => attempt.challengeId === challenge.id,
        );
        return total + bestStarsForChallenge(challengeAttempts);
      }, 0),
    [attempts],
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline" className="font-mono text-[10px] tracking-[0.16em] uppercase">
            Session history
          </Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Progress & attempts</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Every completed run is scored on survival, budget, and headroom. Attempts stay in this
            browser session until persistence arrives in M6.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{NUMBER_FORMAT.format(attempts.length)} attempts</Badge>
          <Badge variant="secondary">
            {totalStars}/{MAX_TOTAL_STARS} stars
          </Badge>
          <Badge variant="outline">{groups.length} challenges</Badge>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-14 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <LineChart className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-lg font-medium">No runs yet</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Open a challenge, build a design, and run the load profile. Your first attempt will land
            here with its stars and bottleneck.
          </p>
          <Button
            className="mt-5"
            nativeButton={false}
            render={<Link to="/challenge/personal-blog" />}
          >
            Run the warm-up
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          {groups.map((group) => (
            <section
              key={group.challenge.id}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold">{group.challenge.title}</h2>
                    <Badge variant="outline">{difficultyLabel(group.challenge.difficulty)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {group.total} attempt{group.total === 1 ? "" : "s"} · showing latest{" "}
                    {group.attempts.length}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StarRating stars={group.bestStars} />
                  <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    render={<Link to={`/challenge/${group.challenge.id}`} />}
                  >
                    Open
                    <ArrowRight aria-hidden="true" />
                  </Button>
                </div>
              </div>

              <ul className="mt-4 divide-y divide-border/70">
                {group.attempts.map((attempt) => (
                  <li
                    key={attempt.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5 text-sm"
                  >
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
                    <div className="ml-auto flex flex-wrap gap-1.5">
                      <Badge variant={attempt.sloMet ? "secondary" : "destructive"}>
                        {attempt.sloMet ? "SLO met" : "SLO missed"}
                      </Badge>
                      <Badge variant={attempt.withinBudget ? "secondary" : "destructive"}>
                        {attempt.withinBudget ? "In budget" : "Over budget"}
                      </Badge>
                    </div>
                    {attempt.failureSummary === undefined ? null : (
                      <p className="w-full text-xs text-muted-foreground">
                        {attempt.failureSummary}
                      </p>
                    )}
                  </li>
                ))}
              </ul>

              {group.total > group.attempts.length ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {group.total - group.attempts.length} older attempt
                  {group.total - group.attempts.length === 1 ? "" : "s"} kept in session history.
                </p>
              ) : null}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
