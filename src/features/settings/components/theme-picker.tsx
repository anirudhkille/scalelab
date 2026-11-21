import { Check, Palette } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

import { useSettingsStore } from "../store/app-store";
import { THEMES } from "../themes";

export function ThemePicker() {
  const theme = useSettingsStore((state) => state.settings.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const current = THEMES.find((item) => item.id === theme) ?? THEMES[0];

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="outline" size="sm" className="gap-2" aria-label="Change theme" />}
      >
        <Palette className="size-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">{current.label}</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <div className="px-2 pt-1 pb-2">
          <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
            Theme
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Four palettes, one design system. Saved with your progress.
          </p>
        </div>
        <div role="radiogroup" aria-label="Color theme" className="flex flex-col gap-0.5">
          {THEMES.map((item) => {
            const selected = item.id === theme;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(item.id)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-2 py-2 text-left transition-colors outline-none",
                  "hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                  selected && "bg-muted/70",
                )}
              >
                <span
                  data-theme={item.id}
                  className="grid size-7 shrink-0 place-items-center rounded-full border border-border bg-background"
                >
                  <span className="size-3.5 rounded-full bg-primary" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.description}
                  </span>
                </span>
                {selected ? (
                  <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
