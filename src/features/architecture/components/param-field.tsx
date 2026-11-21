import { useCallback } from "react";

import type { ComponentParams } from "../model/schema";
import type { ParamFieldSpec } from "../model/param-specs";
import { NumberParamField } from "./number-param-field";
import { SelectParamField } from "./select-param-field";
import { SwitchParamField } from "./switch-param-field";

type ParamFieldProps = {
  readonly field: ParamFieldSpec;
  readonly params: ComponentParams;
  readonly onPatch: (key: string, value: unknown) => void;
};

export function ParamField({ field, params, onPatch }: ParamFieldProps) {
  const raw = Reflect.get(params, field.key) as unknown;

  const patchNumber = useCallback(
    (value: number) => onPatch(field.key, value),
    [field.key, onPatch],
  );
  const patchSelect = useCallback(
    (value: string) => onPatch(field.key, value),
    [field.key, onPatch],
  );
  const patchSwitch = useCallback(
    (value: boolean) => onPatch(field.key, value),
    [field.key, onPatch],
  );

  switch (field.type) {
    case "number": {
      const fallback = field.min / (field.scale ?? 1);
      const value = typeof raw === "number" ? raw : fallback;

      return (
        <NumberParamField
          key={`${field.key}:${value}`}
          field={field}
          value={value}
          onChange={patchNumber}
        />
      );
    }
    case "select":
      return (
        <SelectParamField
          field={field}
          value={typeof raw === "string" ? raw : (field.options[0]?.value ?? "")}
          onChange={patchSelect}
        />
      );
    case "switch":
      return <SwitchParamField field={field} value={raw === true} onChange={patchSwitch} />;
  }
}
