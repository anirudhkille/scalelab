import { FlaskConical } from "lucide-react";

import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";

import { DEFAULT_LOAD_MODIFIERS, type LoadModifiers } from "../schema";

type LoadLabDialogProps = {
  readonly value: LoadModifiers;
  readonly onChange: (next: LoadModifiers) => void;
  readonly disabled?: boolean;
};

type ToggleRowProps = {
  readonly label: string;
  readonly description: string;
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
};

function ToggleRow({ label, description, checked, onCheckedChange }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border/70 p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}

function withCacheFlush(modifiers: LoadModifiers, cacheFlushAtSec: number | undefined) {
  const { cacheFlushAtSec: _previous, ...rest } = modifiers;
  return cacheFlushAtSec === undefined ? rest : { ...rest, cacheFlushAtSec };
}

function preset(
  modifiers: LoadModifiers,
  overrides: {
    retryStorm?: LoadModifiers["retryStorm"];
    trafficWave?: LoadModifiers["trafficWave"];
    hotKey?: LoadModifiers["hotKey"];
    cacheFlushAtSec?: number;
  },
): LoadModifiers {
  return {
    ...modifiers,
    retryStorm: overrides.retryStorm ?? { ...modifiers.retryStorm, enabled: false },
    trafficWave: overrides.trafficWave ?? { ...modifiers.trafficWave, enabled: false },
    hotKey: overrides.hotKey ?? { ...modifiers.hotKey, enabled: false },
    ...(overrides.cacheFlushAtSec === undefined
      ? {}
      : { cacheFlushAtSec: overrides.cacheFlushAtSec }),
  };
}

export function LoadLabDialog({ value, onChange, disabled = false }: LoadLabDialogProps) {
  const cacheFlushEnabled = value.cacheFlushAtSec !== undefined;

  return (
    <Dialog>
      <DialogTrigger
        render={<Button type="button" variant="outline" size="sm" disabled={disabled} />}
      >
        <FlaskConical />
        Load lab
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Load lab</DialogTitle>
          <DialogDescription>
            Real traffic is not a clean ramp. Add failure loops, daily peaks, hot keys, and cache
            flushes to the next run.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              onChange(preset(value, { retryStorm: { enabled: true, maxAttempts: 4 } }))
            }
          >
            Retry storm
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              onChange(
                preset(value, {
                  cacheFlushAtSec: 20,
                  trafficWave: { enabled: true, amplitudeRatio: 0.4, periodSec: 40 },
                }),
              )
            }
          >
            Cache flush + wave
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              onChange(
                preset(value, {
                  hotKey: { enabled: true, target: "database", skewRatio: 0.7 },
                }),
              )
            }
          >
            Hot shard
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(DEFAULT_LOAD_MODIFIERS)}
          >
            Reset
          </Button>
        </div>

        <div className="space-y-3">
          <ToggleRow
            label="Clients retry on error"
            description="Each failed request is retried. A small overload can snowball into a retry collapse."
            checked={value.retryStorm.enabled}
            onCheckedChange={(enabled) =>
              onChange({ ...value, retryStorm: { ...value.retryStorm, enabled } })
            }
          />
          {value.retryStorm.enabled ? (
            <label
              htmlFor="retry-max-attempts"
              className="ml-3 flex items-center justify-between gap-4 text-xs"
            >
              <span className="text-muted-foreground">Maximum attempts per request</span>
              <Input
                id="retry-max-attempts"
                type="number"
                min={1}
                max={10}
                value={value.retryStorm.maxAttempts}
                onChange={(event) =>
                  onChange({
                    ...value,
                    retryStorm: {
                      ...value.retryStorm,
                      maxAttempts: Math.min(10, Math.max(1, Number(event.target.value) || 1)),
                    },
                  })
                }
                className="w-20"
              />
            </label>
          ) : null}

          <ToggleRow
            label="Daily traffic wave"
            description="A sine wave rides on top of the load profile, so the system keeps meeting peaks and troughs."
            checked={value.trafficWave.enabled}
            onCheckedChange={(enabled) =>
              onChange({ ...value, trafficWave: { ...value.trafficWave, enabled } })
            }
          />
          {value.trafficWave.enabled ? (
            <div className="ml-3 grid grid-cols-2 gap-2">
              <label htmlFor="wave-amplitude" className="space-y-1 text-xs">
                <span className="text-muted-foreground">Amplitude</span>
                <div className="relative">
                  <Input
                    id="wave-amplitude"
                    type="number"
                    min={0}
                    max={100}
                    value={Math.round(value.trafficWave.amplitudeRatio * 100)}
                    onChange={(event) =>
                      onChange({
                        ...value,
                        trafficWave: {
                          ...value.trafficWave,
                          amplitudeRatio: Math.min(
                            1,
                            Math.max(0, (Number(event.target.value) || 0) / 100),
                          ),
                        },
                      })
                    }
                    className="pr-7"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center font-mono text-[10px] text-muted-foreground">
                    %
                  </span>
                </div>
              </label>
              <label htmlFor="wave-period" className="space-y-1 text-xs">
                <span className="text-muted-foreground">Period</span>
                <div className="relative">
                  <Input
                    id="wave-period"
                    type="number"
                    min={5}
                    value={value.trafficWave.periodSec}
                    onChange={(event) =>
                      onChange({
                        ...value,
                        trafficWave: {
                          ...value.trafficWave,
                          periodSec: Math.max(5, Number(event.target.value) || 5),
                        },
                      })
                    }
                    className="pr-8"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center font-mono text-[10px] text-muted-foreground">
                    sec
                  </span>
                </div>
              </label>
            </div>
          ) : null}

          <ToggleRow
            label="Hot key"
            description="One shard or cache key takes most of the traffic, so its effective capacity drops."
            checked={value.hotKey.enabled}
            onCheckedChange={(enabled) =>
              onChange({ ...value, hotKey: { ...value.hotKey, enabled } })
            }
          />
          {value.hotKey.enabled ? (
            <div className="ml-3 grid grid-cols-2 gap-2">
              <div className="space-y-1 text-xs">
                <span className="text-muted-foreground">Target</span>
                <Select
                  value={value.hotKey.target}
                  onValueChange={(target) => {
                    if (target === "cache" || target === "database" || target === "searchIndex") {
                      onChange({ ...value, hotKey: { ...value.hotKey, target } });
                    }
                  }}
                >
                  <SelectTrigger size="sm" className="w-full" aria-label="Hot key target">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cache">Cache</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="searchIndex">Search index</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label htmlFor="hot-key-skew" className="space-y-1 text-xs">
                <span className="text-muted-foreground">Skew</span>
                <div className="relative">
                  <Input
                    id="hot-key-skew"
                    type="number"
                    min={0}
                    max={100}
                    value={Math.round(value.hotKey.skewRatio * 100)}
                    onChange={(event) =>
                      onChange({
                        ...value,
                        hotKey: {
                          ...value.hotKey,
                          skewRatio: Math.min(
                            1,
                            Math.max(0, (Number(event.target.value) || 0) / 100),
                          ),
                        },
                      })
                    }
                    className="pr-7"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center font-mono text-[10px] text-muted-foreground">
                    %
                  </span>
                </div>
              </label>
            </div>
          ) : null}

          <ToggleRow
            label="Flush the cache mid-run"
            description="A deploy or restart empties the cache. The next requests miss and stampede the database."
            checked={cacheFlushEnabled}
            onCheckedChange={(enabled) => onChange(withCacheFlush(value, enabled ? 20 : undefined))}
          />
          {cacheFlushEnabled ? (
            <label
              htmlFor="cache-flush-at"
              className="ml-3 flex items-center justify-between gap-4 text-xs"
            >
              <span className="text-muted-foreground">Flush at simulated second</span>
              <Input
                id="cache-flush-at"
                type="number"
                min={0}
                value={value.cacheFlushAtSec ?? 20}
                onChange={(event) =>
                  onChange(withCacheFlush(value, Math.max(0, Number(event.target.value) || 0)))
                }
                className="w-20"
              />
            </label>
          ) : null}
        </div>

        <p className="rounded-lg border border-border/70 bg-muted/25 p-3 text-[11px] leading-relaxed text-muted-foreground">
          The modifiers apply to the next run only. Watch which node saturates first, then replay
          the failure timeline to see it spread.
        </p>
      </DialogContent>
    </Dialog>
  );
}
