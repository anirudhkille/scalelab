import {
  useCallback,
  useId,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";

import type { NumberParamFieldSpec } from "../model/param-specs";

type NumberParamFieldProps = {
  readonly field: NumberParamFieldSpec;
  readonly value: number;
  readonly onChange: (value: number) => void;
};

function formatDisplay(value: number): string {
  return String(Number(value.toFixed(2)));
}

export function NumberParamField({ field, value, onChange }: NumberParamFieldProps) {
  const scale = field.scale ?? 1;
  const displayValue = value * scale;
  const [draft, setDraft] = useState(formatDisplay(displayValue));
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();

  const commit = useCallback(
    (nextDraft: string) => {
      const parsed = Number(nextDraft);

      if (!Number.isFinite(parsed)) {
        setError("Enter a number.");
        return;
      }

      if (parsed < field.min || parsed > field.max) {
        setError(`Use a value between ${field.min} and ${field.max}.`);
        return;
      }

      setError(null);
      onChange(parsed / scale);
    },
    [field.max, field.min, onChange, scale],
  );

  const stepBy = useCallback(
    (direction: 1 | -1) => {
      const current = value * scale;
      const next = Math.min(field.max, Math.max(field.min, current + direction * field.step));
      setError(null);
      onChange(next / scale);
    },
    [field.max, field.min, field.step, onChange, scale, value],
  );

  const handleDecrease = useCallback(() => stepBy(-1), [stepBy]);
  const handleIncrease = useCallback(() => stepBy(1), [stepBy]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setDraft(event.target.value);
      if (error) {
        setError(null);
      }
    },
    [error],
  );

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => commit(event.target.value),
    [commit],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.currentTarget.blur();
      } else if (event.key === "Escape") {
        setDraft(formatDisplay(value * scale));
        setError(null);
      }
    },
    [scale, value],
  );

  const canDecrease = displayValue > field.min;
  const canIncrease = displayValue < field.max;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="text-xs font-medium">
          {field.label}
        </label>
        <span className="font-mono text-[10px] text-muted-foreground">
          {field.min}–{field.max}
          {field.unit ? ` ${field.unit}` : ""}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`Decrease ${field.label}`}
          disabled={!canDecrease}
          onClick={handleDecrease}
        >
          <Minus />
        </Button>

        <Input
          id={inputId}
          type="number"
          inputMode="decimal"
          min={field.min}
          max={field.max}
          step={field.step}
          value={draft}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn("text-center font-mono text-xs", error && "border-destructive")}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={`Increase ${field.label}`}
          disabled={!canIncrease}
          onClick={handleIncrease}
        >
          <Plus />
        </Button>
      </div>

      {field.hint ? (
        <p className="text-[10px] leading-relaxed text-muted-foreground">{field.hint}</p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-[10px] text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
