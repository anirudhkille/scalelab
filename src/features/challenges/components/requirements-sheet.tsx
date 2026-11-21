import {
  Activity,
  Database,
  Gauge,
  HardDrive,
  Percent,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";
import { COMPONENT_CATALOG } from "@/features/architecture";

import { difficultyLabel } from "../difficulty";
import type { Challenge } from "../schema";

const NUMBER_FORMAT = new Intl.NumberFormat("en-US");

function percent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

function requirementRows(challenge: Challenge) {
  const requirements = challenge.requirements;

  return [
    {
      icon: Users,
      label: "Target users",
      value: NUMBER_FORMAT.format(requirements.targetUsers),
    },
    {
      icon: Activity,
      label: "Requests / user / sec",
      value: requirements.requestsPerUserPerSec.toFixed(1),
    },
    {
      icon: Gauge,
      label: "p95 latency SLO",
      value: `${requirements.latencyP95Ms} ms`,
    },
    {
      icon: Percent,
      label: "Max error rate",
      value: percent(requirements.maxErrorRatio),
    },
    {
      icon: HardDrive,
      label: "Working set",
      value: `${requirements.workingSetGb} GB`,
    },
    {
      icon: Database,
      label: "Data size",
      value: `${requirements.dataSizeGb} GB`,
    },
    {
      icon: ShieldCheck,
      label: "Availability",
      value: percent(requirements.availabilityRatio ?? 0.99),
    },
    {
      icon: Target,
      label: "Monthly budget",
      value: `$${NUMBER_FORMAT.format(requirements.monthlyBudgetUsd)}`,
    },
  ] as const;
}

function withStartTimes(
  stages: Challenge["loadProfile"],
): readonly (Challenge["loadProfile"][number] & {
  readonly startSec: number;
  readonly stageNumber: number;
})[] {
  let elapsedSec = 0;

  return stages.map((stage, index) => {
    const startSec = elapsedSec;
    elapsedSec += stage.durationSec;
    return { ...stage, startSec, stageNumber: index + 1 };
  });
}

export function RequirementsSheet({ challenge }: { readonly challenge: Challenge }) {
  const requirements = challenge.requirements;
  const loadStages = withStartTimes(challenge.loadProfile);

  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" size="sm" />}>Requirements</SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px] uppercase">
              {difficultyLabel(challenge.difficulty)}
            </Badge>
            <span className="font-mono text-[10px] text-muted-foreground">
              Level {challenge.difficulty}
            </span>
          </div>
          <SheetTitle>{challenge.title}</SheetTitle>
          <SheetDescription>{challenge.concepts.slice(0, 4).join(" · ")}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-6">
          <section>
            <h3 className="text-xs font-semibold tracking-wider uppercase">Brief</h3>
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
              {challenge.briefMd}
            </p>
          </section>

          <Separator />

          <section>
            <h3 className="text-xs font-semibold tracking-wider uppercase">Numbers</h3>
            <dl className="mt-3 grid grid-cols-2 gap-2">
              {requirementRows(challenge).map((row) => (
                <div
                  key={row.label}
                  className="rounded-lg border border-border/70 bg-muted/25 p-2.5"
                >
                  <dt className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <row.icon className="size-3" aria-hidden="true" />
                    {row.label}
                  </dt>
                  <dd className="mt-1 font-mono text-sm">{row.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Traffic mix: {percent(requirements.readRatio)} reads ·{" "}
              {percent(1 - requirements.readRatio)} writes · {percent(requirements.staticRatio)}{" "}
              static.
            </p>
          </section>

          <Separator />

          <section>
            <h3 className="text-xs font-semibold tracking-wider uppercase">Load profile</h3>
            <ol className="mt-3 space-y-2">
              {loadStages.map((stage) => (
                <li
                  key={stage.startSec}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2 text-xs"
                >
                  <span className="text-muted-foreground">Stage {stage.stageNumber}</span>
                  <span className="font-mono">
                    {NUMBER_FORMAT.format(stage.fromUsers)} → {NUMBER_FORMAT.format(stage.toUsers)}{" "}
                    users
                  </span>
                  <span className="font-mono text-muted-foreground">{stage.durationSec}s</span>
                </li>
              ))}
            </ol>
          </section>

          {challenge.failureScenarios && challenge.failureScenarios.length > 0 ? (
            <>
              <Separator />
              <section>
                <h3 className="text-xs font-semibold tracking-wider uppercase">
                  Failure scenarios
                </h3>
                <ul className="mt-3 space-y-2">
                  {challenge.failureScenarios.map((failure) => {
                    const target =
                      failure.nodeId === undefined
                        ? failure.zone
                          ? `Zone ${failure.zone.toUpperCase()}`
                          : "All nodes"
                        : (challenge.starterArchitecture?.nodes.find(
                            (node) => node.id === failure.nodeId,
                          )?.label ?? failure.nodeId);

                    return (
                      <li
                        key={`${failure.atSec}-${failure.kind}-${target}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2 text-xs"
                      >
                        <span className="text-muted-foreground">
                          {failure.kind === "killNode"
                            ? "Node killed"
                            : failure.kind === "slowNode"
                              ? "Node degraded"
                              : "Zone outage"}
                        </span>
                        <span className="truncate font-mono">{target}</span>
                        <span className="shrink-0 font-mono text-muted-foreground">
                          {failure.atSec}s · {failure.durationSec}s
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </>
          ) : null}

          <Separator />

          <section>
            <h3 className="text-xs font-semibold tracking-wider uppercase">Allowed components</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {challenge.allowedComponents.map((kind) => (
                <Badge key={kind} variant="secondary" className="font-normal">
                  {COMPONENT_CATALOG[kind].label}
                </Badge>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold tracking-wider uppercase">You will learn</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {challenge.learningGoals.map((goal) => (
                <li key={goal} className="flex gap-2">
                  <span aria-hidden="true" className="text-primary">
                    ·
                  </span>
                  {goal}
                </li>
              ))}
            </ul>
          </section>

          <p className="rounded-lg border border-border/70 bg-muted/25 p-3 text-[11px] leading-relaxed text-muted-foreground">
            Hints unlock after a failed run. You can run the design as many times as you like before
            spending one.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
