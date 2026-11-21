import { useCallback, useId, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Copy, Trash2 } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Separator } from "@/shared/ui/separator";

import { COMPONENT_CATALOG, monthlyCostUsd } from "../model/catalog";
import { COMPONENT_PARAM_SPECS } from "../model/param-specs";
import type { ArchNode, ComponentParams } from "../model/schema";
import { REGION_IDS, ZONE_IDS, type RegionId, type ZoneId } from "../model/types";
import { useDesignStore } from "../store/design-store";
import { ComponentIcon } from "./component-icon";
import { ParamField } from "./param-field";

const REGION_OPTIONS = [
  { value: "us-east", label: "US East" },
  { value: "eu-west", label: "EU West" },
  { value: "ap-south", label: "AP South" },
] as const;

const ZONE_OPTIONS = [
  { value: "a", label: "Zone A" },
  { value: "b", label: "Zone B" },
  { value: "c", label: "Zone C" },
] as const;

type NodeInspectorProps = {
  readonly node: ArchNode;
};

export function NodeInspector({ node }: NodeInspectorProps) {
  const updateNodeLabel = useDesignStore((state) => state.updateNodeLabel);
  const updateNodeParams = useDesignStore((state) => state.updateNodeParams);
  const updateNodePlacement = useDesignStore((state) => state.updateNodePlacement);
  const removeNode = useDesignStore((state) => state.removeNode);
  const duplicateSelectedNode = useDesignStore((state) => state.duplicateSelectedNode);
  const [label, setLabel] = useState(node.label);
  const labelId = useId();
  const isClients = node.params.kind === "clients";
  const catalog = COMPONENT_CATALOG[node.params.kind];
  const fields = COMPONENT_PARAM_SPECS[node.params.kind];

  const commitLabel = useCallback(() => {
    if (!updateNodeLabel(node.id, label)) {
      setLabel(node.label);
    }
  }, [label, node.id, node.label, updateNodeLabel]);

  const patchParam = useCallback(
    (key: string, value: unknown) => {
      const next = { ...node.params, [key]: value } as ComponentParams;
      updateNodeParams(node.id, next);
    },
    [node.id, node.params, updateNodeParams],
  );

  const handleLabelChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setLabel(event.target.value);
  }, []);

  const handleLabelBlur = useCallback(() => commitLabel(), [commitLabel]);

  const handleLabelKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.currentTarget.blur();
      } else if (event.key === "Escape") {
        setLabel(node.label);
        event.currentTarget.blur();
      }
    },
    [node.label],
  );

  const handleRegionChange = useCallback(
    (value: unknown) => {
      if (typeof value !== "string") return;
      if (!(REGION_IDS as readonly string[]).includes(value)) return;
      updateNodePlacement(node.id, value as RegionId, node.zone);
    },
    [node.id, node.zone, updateNodePlacement],
  );

  const handleZoneChange = useCallback(
    (value: unknown) => {
      if (typeof value !== "string") return;
      if (!(ZONE_IDS as readonly string[]).includes(value)) return;
      updateNodePlacement(node.id, node.region, value as ZoneId);
    },
    [node.id, node.region, updateNodePlacement],
  );

  const handleDuplicate = useCallback(() => {
    duplicateSelectedNode();
  }, [duplicateSelectedNode]);

  const handleRemove = useCallback(() => {
    removeNode(node.id);
  }, [node.id, removeNode]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-start gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <ComponentIcon kind={node.params.kind} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{node.label}</p>
          <p className="text-[10px] tracking-wider text-muted-foreground uppercase">
            {catalog.label}
          </p>
        </div>
        <span className="ml-auto shrink-0 font-mono text-xs">
          ${monthlyCostUsd(node.params)}/mo
        </span>
      </div>

      <Separator />

      <div className="space-y-1.5">
        <label htmlFor={labelId} className="text-xs font-medium">
          Label
        </label>
        <Input
          key={node.label}
          id={labelId}
          value={label}
          maxLength={48}
          onChange={handleLabelChange}
          onBlur={handleLabelBlur}
          onKeyDown={handleLabelKeyDown}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <span className="text-xs font-medium">Region</span>
          <Select items={REGION_OPTIONS} value={node.region} onValueChange={handleRegionChange}>
            <SelectTrigger size="sm" className="w-full" aria-label="Node region">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <span className="text-xs font-medium">Zone</span>
          <Select items={ZONE_OPTIONS} value={node.zone} onValueChange={handleZoneChange}>
            <SelectTrigger size="sm" className="w-full" aria-label="Node availability zone">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ZONE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {fields.length > 0 ? (
        <div className="space-y-4">
          <p className="text-[10px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
            Parameters
          </p>
          {fields.map((field) => (
            <ParamField key={field.key} field={field} params={node.params} onPatch={patchParam} />
          ))}
        </div>
      ) : (
        <p className="rounded-lg bg-muted/40 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
          This component has no tunable parameters yet.
        </p>
      )}

      <Separator />

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isClients}
          title={isClients ? "The traffic source cannot be duplicated" : "Duplicate (Ctrl+D)"}
          onClick={handleDuplicate}
        >
          <Copy />
          Duplicate
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={isClients}
          title={isClients ? "The traffic source cannot be deleted" : "Delete (Del)"}
          onClick={handleRemove}
        >
          <Trash2 />
          Delete
        </Button>
      </div>
    </div>
  );
}
