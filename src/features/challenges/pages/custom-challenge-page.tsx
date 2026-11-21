import { useCallback, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ArrowRight, Plus, Trash2, Upload } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import { PageMeta } from "@/shared/seo";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

import {
  createCustomChallenge,
  customChallengeSchema,
  customChallengesSchema,
  type CustomChallenge,
} from "../custom";
import { CHALLENGES, challengeOrFallback } from "../data/catalog";
import { difficultyLabel, type ChallengeDifficulty } from "../difficulty";
import { selectCustomChallenges, useCustomChallengeStore } from "../store/custom-challenge-store";

const NUMBER_FORMAT = Intl.NumberFormat("en-US");
const MONEY_FORMAT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function CustomChallengePage() {
  const navigate = useNavigate();
  const customChallenges = useCustomChallengeStore(selectCustomChallenges);
  const saveCustomChallenge = useCustomChallengeStore((state) => state.saveCustomChallenge);
  const removeCustomChallenge = useCustomChallengeStore((state) => state.removeCustomChallenge);
  const [title, setTitle] = useState("My custom service");
  const [baseDesignId, setBaseDesignId] = useState("personal-blog");
  const [difficulty, setDifficulty] = useState<ChallengeDifficulty>(3);
  const [targetUsers, setTargetUsers] = useState(500);
  const [rpsPerUser, setRpsPerUser] = useState(2);
  const [readPercent, setReadPercent] = useState(70);
  const [staticPercent, setStaticPercent] = useState(20);
  const [latencyP95Ms, setLatencyP95Ms] = useState(250);
  const [errorPercent, setErrorPercent] = useState(1);
  const [budgetUsd, setBudgetUsd] = useState(1_000);
  const [rampSec, setRampSec] = useState(60);
  const [holdSec, setHoldSec] = useState(30);
  const [importJson, setImportJson] = useState("");
  const base = useMemo(() => challengeOrFallback(baseDesignId), [baseDesignId]);

  const handleTitleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  }, []);

  const handleBaseDesignChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setBaseDesignId(event.target.value);
  }, []);

  const handleDifficultyChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setDifficulty(Number(event.target.value) as ChallengeDifficulty);
  }, []);

  const handleImportJsonChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setImportJson(event.target.value);
  }, []);

  const handleRemove = useCallback(
    (id: string) => {
      removeCustomChallenge(id);
    },
    [removeCustomChallenge],
  );

  const handleSave = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      try {
        const challenge = createCustomChallenge({
          title,
          difficulty,
          concepts: [...base.concepts],
          briefMd: `A custom variant of ${base.title}. Build for ${NUMBER_FORMAT.format(targetUsers)} users and keep p95 under ${latencyP95Ms} ms.`,
          requirements: {
            targetUsers,
            requestsPerUserPerSec: rpsPerUser,
            readRatio: readPercent / 100,
            staticRatio: staticPercent / 100,
            workingSetGb: base.requirements.workingSetGb,
            dataSizeGb: base.requirements.dataSizeGb,
            latencyP95Ms,
            maxErrorRatio: errorPercent / 100,
            availabilityRatio: base.requirements.availabilityRatio ?? 0.99,
            monthlyBudgetUsd: budgetUsd,
          },
          loadProfile: [
            { durationSec: rampSec, fromUsers: 0, toUsers: targetUsers * 2 },
            { durationSec: holdSec, fromUsers: targetUsers * 2, toUsers: targetUsers * 2 },
          ],
          allowedComponents: [...base.allowedComponents],
          hints: [...base.hints],
          learningGoals: [...base.learningGoals],
          baseDesignId,
        });

        saveCustomChallenge(challenge);
        toast.success("Custom challenge saved");
        navigate(`/challenge/${challenge.id}`);
      } catch {
        toast.error("Check the custom challenge values");
      }
    },
    [
      base,
      baseDesignId,
      budgetUsd,
      difficulty,
      errorPercent,
      holdSec,
      latencyP95Ms,
      navigate,
      rampSec,
      readPercent,
      rpsPerUser,
      saveCustomChallenge,
      staticPercent,
      targetUsers,
      title,
    ],
  );

  const handleImport = useCallback(() => {
    try {
      const parsed: unknown = JSON.parse(importJson);
      const single = customChallengeSchema.safeParse(parsed);
      const many = customChallengesSchema.safeParse(parsed);
      const challenges = single.success ? [single.data] : many.success ? many.data : null;

      if (!challenges) {
        throw new Error("Invalid custom challenge JSON");
      }

      for (const challenge of challenges) {
        saveCustomChallenge(challenge);
      }

      setImportJson("");
      toast.success(
        challenges.length === 1
          ? "Custom challenge imported"
          : `${challenges.length} custom challenges imported`,
      );
    } catch {
      toast.error("That JSON is not a valid custom challenge");
    }
  }, [importJson, saveCustomChallenge]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <PageMeta
        title="Custom Challenge — ScaleLab"
        description="Build a custom system-design challenge with your own traffic, SLO, budget, and load profile."
        path="/custom"
      />

      <Badge variant="outline" className="font-mono text-[10px] tracking-[0.16em] uppercase">
        Phase 3
      </Badge>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Build a custom challenge</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Pick a starting design, set the numbers, and run it like any built-in challenge. Custom
        challenges stay in your browser and are never uploaded.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <form onSubmit={handleSave} className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-medium">Challenge definition</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-medium sm:col-span-2" htmlFor="custom-title">
              Title
              <Input
                id="custom-title"
                className="mt-1.5"
                value={title}
                maxLength={80}
                onChange={handleTitleChange}
                required
              />
            </label>
            <label className="text-xs font-medium">
              Starting design
              <select
                className="mt-1.5 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={baseDesignId}
                onChange={handleBaseDesignChange}
              >
                {CHALLENGES.map((challenge) => (
                  <option key={challenge.id} value={challenge.id}>
                    {challenge.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium">
              Difficulty
              <select
                className="mt-1.5 h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={difficulty}
                onChange={handleDifficultyChange}
              >
                {[1, 2, 3, 4, 5].map((level) => (
                  <option key={level} value={level}>
                    Level {level} · {difficultyLabel(level as ChallengeDifficulty)}
                  </option>
                ))}
              </select>
            </label>
            <NumberInput
              label="Target users"
              value={targetUsers}
              min={50}
              onChange={setTargetUsers}
            />
            <NumberInput
              label="Requests / user / sec"
              value={rpsPerUser}
              min={0.2}
              step={0.1}
              onChange={setRpsPerUser}
            />
            <NumberInput
              label="Read share %"
              value={readPercent}
              min={0}
              max={100}
              onChange={setReadPercent}
            />
            <NumberInput
              label="Static share %"
              value={staticPercent}
              min={0}
              max={100}
              onChange={setStaticPercent}
            />
            <NumberInput
              label="p95 SLO (ms)"
              value={latencyP95Ms}
              min={50}
              onChange={setLatencyP95Ms}
            />
            <NumberInput
              label="Error budget %"
              value={errorPercent}
              min={0.1}
              max={10}
              step={0.1}
              onChange={setErrorPercent}
            />
            <NumberInput
              label="Monthly budget (USD)"
              value={budgetUsd}
              min={100}
              step={50}
              onChange={setBudgetUsd}
            />
            <NumberInput label="Ramp seconds" value={rampSec} min={10} onChange={setRampSec} />
            <NumberInput label="Hold seconds" value={holdSec} min={10} onChange={setHoldSec} />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button type="submit">
              <Plus className="size-4" aria-hidden="true" />
              Save and open
            </Button>
            <span className="text-xs text-muted-foreground">
              Base pressure: {base.requirements.workingSetGb} GB working set ·{" "}
              {base.requirements.dataSizeGb} GB stored
            </span>
          </div>
        </form>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-medium">Import JSON</h2>
            <textarea
              className="mt-2 h-28 w-full resize-none rounded-lg border border-input bg-background p-2 font-mono text-[11px]"
              placeholder='{"title":"...","requirements":{...}}'
              value={importJson}
              onChange={handleImportJsonChange}
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={handleImport}
              disabled={importJson.trim().length === 0}
            >
              <Upload className="size-3.5" aria-hidden="true" />
              Import challenge
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-medium">Saved challenges</h2>
            {customChallenges.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Nothing saved yet. Build one above or import JSON.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {customChallenges.map((challenge) => (
                  <SavedChallengeRow
                    key={challenge.id}
                    challenge={challenge}
                    onRemove={handleRemove}
                  />
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SavedChallengeRow({
  challenge,
  onRemove,
}: {
  readonly challenge: CustomChallenge;
  readonly onRemove: (id: string) => void;
}) {
  const handleRemove = useCallback(() => {
    onRemove(challenge.id);
  }, [challenge.id, onRemove]);

  return (
    <li className="flex items-center gap-2 rounded-lg border border-border/70 p-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{challenge.title}</p>
        <p className="font-mono text-[10px] text-muted-foreground">
          {NUMBER_FORMAT.format(challenge.requirements.targetUsers)} users ·{" "}
          {MONEY_FORMAT.format(challenge.requirements.monthlyBudgetUsd)}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        nativeButton={false}
        render={<Link to={`/challenge/${challenge.id}`} aria-label="Open challenge" />}
      >
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete ${challenge.title}`}
        onClick={handleRemove}
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
      </Button>
    </li>
  );
}

function NumberInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max?: number;
  readonly step?: number;
  readonly onChange: (value: number) => void;
}) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const parsed = Number(event.target.value);

      if (Number.isFinite(parsed)) {
        onChange(parsed);
      }
    },
    [onChange],
  );

  return (
    <label className="text-xs font-medium">
      {label}
      <Input
        className="mt-1.5"
        type="number"
        min={min}
        max={max}
        step={step ?? 1}
        value={value}
        onChange={handleChange}
      />
    </label>
  );
}
