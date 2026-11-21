import { useCallback, useState } from "react";
import { ArrowRight, Compass, Gauge, LineChart, type LucideIcon } from "lucide-react";

import { useSettingsStore } from "@/features/settings";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { cn } from "@/shared/lib/utils";

type OnboardingStep = {
  readonly title: string;
  readonly body: string;
  readonly icon: LucideIcon;
};

const STEPS = [
  {
    title: "Build the system",
    body: "Drag components onto the canvas and connect them in the order a request travels. Start with clients, then add servers, caches, queues, and storage as the challenge needs.",
    icon: Compass,
  },
  {
    title: "Run the load test",
    body: "Start a run and watch the traffic ramp. Node health, edge flow, and the live charts show where load is accepted, queued, or dropped in real time.",
    icon: Gauge,
  },
  {
    title: "Read the failure",
    body: "When a component gives out, ScaleLab names the bottleneck and explains the numbers behind it. Use the hint, fix one thing, and run it again.",
    icon: LineChart,
  },
] as const satisfies readonly OnboardingStep[];

export function OnboardingTour() {
  const onboardingComplete = useSettingsStore((state) => state.settings.onboardingComplete);
  const completeOnboarding = useSettingsStore((state) => state.completeOnboarding);
  const [open, setOpen] = useState(() => !onboardingComplete);
  const [stepIndex, setStepIndex] = useState(0);

  const step = STEPS[stepIndex] ?? STEPS[0];
  const isLastStep = stepIndex === STEPS.length - 1;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);

      if (!nextOpen) {
        completeOnboarding();
      }
    },
    [completeOnboarding],
  );

  const handleNext = useCallback(() => {
    if (isLastStep) {
      completeOnboarding();
      setOpen(false);
      return;
    }

    setStepIndex((current) => current + 1);
  }, [completeOnboarding, isLastStep]);

  const handleBack = useCallback(() => {
    setStepIndex((current) => Math.max(0, current - 1));
  }, []);

  const handleSkip = useCallback(() => {
    completeOnboarding();
    setOpen(false);
  }, [completeOnboarding]);

  const StepIcon = step.icon;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <StepIcon className="size-4" aria-hidden="true" />
            <span className="font-mono text-[11px] tracking-wider uppercase">
              Step {stepIndex + 1} of {STEPS.length}
            </span>
          </div>
          <DialogTitle className="text-lg">{step.title}</DialogTitle>
          <DialogDescription className="leading-relaxed">{step.body}</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <div className="flex items-center gap-2" aria-hidden="true">
            {STEPS.map((stepItem, index) => (
              <span
                key={stepItem.title}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === stepIndex ? "w-6 bg-primary" : "w-1.5 bg-border",
                  index < stepIndex && "bg-primary/60",
                )}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            You can replay this tour from the keyboard shortcuts dialog at any time.
          </p>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={handleSkip}>
            Skip tour
          </Button>
          <div className="flex items-center justify-end gap-2">
            {stepIndex > 0 ? (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            ) : null}
            <Button onClick={handleNext}>
              {isLastStep ? "Start designing" : "Next"}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
