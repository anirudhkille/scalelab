import { useCallback, useId } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

import type { SelectParamFieldSpec } from "../model/param-specs";

type SelectParamFieldProps = {
  readonly field: SelectParamFieldSpec;
  readonly value: string;
  readonly onChange: (value: string) => void;
};

export function SelectParamField({ field, value, onChange }: SelectParamFieldProps) {
  const selectId = useId();
  const handleValueChange = useCallback(
    (next: unknown) => {
      if (typeof next === "string") {
        onChange(next);
      }
    },
    [onChange],
  );

  return (
    <div className="space-y-1.5">
      <label htmlFor={selectId} className="text-xs font-medium">
        {field.label}
      </label>

      <Select items={field.options} value={value} onValueChange={handleValueChange}>
        <SelectTrigger id={selectId} size="sm" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {field.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {field.hint ? (
        <p className="text-[10px] leading-relaxed text-muted-foreground">{field.hint}</p>
      ) : null}
    </div>
  );
}
