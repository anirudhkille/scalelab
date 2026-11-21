import { useCallback, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, Download, LineChart, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { CHALLENGES, difficultyLabel } from "@/features/challenges";
import { useSettingsStore } from "@/features/settings";
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

import { AttemptCompareDialog } from "../components/attempt-compare-dialog";
import { AttemptRow } from "../components/attempt-row";
import { StarRating } from "../components/star-rating";
import { buildExport, downloadExport, parseExport } from "../data-transfer";
import type { AttemptRecord } from "../schema";
import { summarizeProgress } from "../stats";
import {
  bestStarsForChallenge,
  selectAttempts,
  selectProgressData,
  useAttemptStore,
} from "../store/attempt-store";

const NUMBER_FORMAT = new Intl.NumberFormat("en-US");

type ComparePair = {
  readonly current: AttemptRecord;
  readonly previous: AttemptRecord;
};

export function ProgressPage() {
  const attempts = useAttemptStore(selectAttempts);
  const replaceProgress = useAttemptStore((state) => state.replaceProgress);
  const resetProgress = useAttemptStore((state) => state.resetProgress);
  const saveDesign = useAttemptStore((state) => state.saveDesign);
  const replaceSettings = useSettingsStore((state) => state.replaceSettings);
  const resetSettings = useSettingsStore((state) => state.resetSettings);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [compare, setCompare] = useState<ComparePair | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  const summary = useMemo(() => summarizeProgress(attempts), [attempts]);

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

  const handleExport = useCallback(() => {
    const data = buildExport(
      useSettingsStore.getState().settings,
      selectProgressData(useAttemptStore.getState()),
    );
    downloadExport(data);
    toast.success("Progress exported", {
      description: "Keep the JSON file somewhere safe.",
    });
  }, []);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file) {
        return;
      }

      let parsed: ReturnType<typeof parseExport>;

      try {
        parsed = parseExport(await file.text());
      } catch {
        parsed = { ok: false, error: "The file could not be read." };
      }

      if (!parsed.ok) {
        toast.error("Import failed", { description: parsed.error });
        return;
      }

      replaceProgress(parsed.data.progress);
      replaceSettings(parsed.data.settings);
      toast.success("Progress imported", {
        description: "Attempts, saved designs, hints, and settings were restored.",
      });
    },
    [replaceProgress, replaceSettings],
  );

  const handleCompareOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setCompare(null);
    }
  }, []);

  const handleCompare = useCallback((current: AttemptRecord, previous: AttemptRecord) => {
    setCompare({ current, previous });
  }, []);

  const handleRestore = useCallback(
    (attempt: AttemptRecord) => {
      saveDesign(attempt.challengeId, attempt.architecture);
      toast.success("Design restored", {
        description: "The challenge will open with this architecture.",
      });
      navigate(`/challenge/${attempt.challengeId}`);
    },
    [navigate, saveDesign],
  );

  const handleResetOpen = useCallback(() => {
    setResetOpen(true);
  }, []);

  const handleResetOpenChange = useCallback((open: boolean) => {
    setResetOpen(open);
  }, []);

  const handleResetClose = useCallback(() => {
    setResetOpen(false);
  }, []);

  const handleReset = useCallback(() => {
    resetProgress();
    resetSettings();
    setResetOpen(false);
    toast.success("Local data reset", {
      description: "Attempts, saved designs, hints, and settings are back to defaults.",
    });
  }, [resetProgress, resetSettings]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Badge variant="outline" className="font-mono text-[10px] tracking-[0.16em] uppercase">
            Saved locally
          </Badge>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Progress & attempts</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Every completed run is scored on survival, budget, and headroom. Attempts, designs,
            hints, and settings live only in this browser.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download data-icon="inline-start" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={handleImportClick}>
            <Upload data-icon="inline-start" />
            Import
          </Button>
          <Button variant="ghost" size="sm" onClick={handleResetOpen}>
            <Trash2 data-icon="inline-start" />
            Reset
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            aria-label="Import ScaleLab progress"
            className="sr-only"
            onChange={handleImportFile}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Badge variant="secondary">{NUMBER_FORMAT.format(attempts.length)} attempts</Badge>
        <Badge variant="secondary">
          {summary.totalStars}/{summary.maxStars} stars
        </Badge>
        <Badge variant="outline">
          {summary.completedChallenges}/{CHALLENGES.length} challenges passed
        </Badge>
        <Badge variant="outline">{summary.streakDays} day streak</Badge>
      </div>

      {summary.concepts.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-xs font-semibold tracking-wider uppercase">Concepts practiced</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {summary.concepts.map((concept) => (
              <Badge key={concept} variant="secondary">
                {concept}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

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
                {group.attempts.map((attempt, index) => (
                  <AttemptRow
                    key={attempt.id}
                    attempt={attempt}
                    previous={group.attempts[index + 1]}
                    onCompare={handleCompare}
                    onRestore={handleRestore}
                  />
                ))}
              </ul>

              {group.total > group.attempts.length ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {group.total - group.attempts.length} older attempt
                  {group.total - group.attempts.length === 1 ? "" : "s"} saved locally.
                </p>
              ) : null}
            </section>
          ))}
        </div>
      )}

      {compare ? (
        <AttemptCompareDialog
          open
          challengeTitle={
            CHALLENGES.find((challenge) => challenge.id === compare.current.challengeId)?.title ??
            "Challenge"
          }
          current={compare.current}
          previous={compare.previous}
          onOpenChange={handleCompareOpenChange}
          onRestorePrevious={handleRestore}
        />
      ) : null}

      <Dialog open={resetOpen} onOpenChange={handleResetOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset local data?</DialogTitle>
            <DialogDescription>
              This deletes every attempt, saved design, unlocked hint, and setting in this browser.
              Export first if you want a backup.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={handleResetClose}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleReset}>
              <Trash2 data-icon="inline-start" />
              Reset everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
