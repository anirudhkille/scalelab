import { useId } from "react";

import { Switch } from "@/shared/ui/switch";

import type { SwitchParamFieldSpec } from "../model/param-specs";

type SwitchParamFieldProps = {
  readonly field: SwitchParamFieldSpec;
  readonly value: boolean;
  readonly onChange: (value: boolean) => void;
};

export function SwitchParamField({ field, value, onChange }: SwitchParamFieldProps) {
  const switchId = useId();

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={switchId} className="text-xs font-medium">
          {field.label}
        </label>
        <Switch id={switchId} checked={value} onCheckedChange={onChange} />
      </div>
      {field.hint ? (
        <p className="text-[10px] leading-relaxed text-muted-foreground">{field.hint}</p>
      ) : null}
    </div>
  );
}
