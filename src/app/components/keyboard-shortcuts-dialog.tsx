import { useCallback, useEffect, useState } from "react";
import { Keyboard, Sparkles } from "lucide-react";

import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";

type Shortcut = {
  readonly keys: readonly string[];
  readonly label: string;
};

type ShortcutGroup = {
  readonly label: string;
  readonly shortcuts: readonly Shortcut[];
};

const SHORTCUT_GROUPS = [
  {
    label: "Workspace",
    shortcuts: [
      { keys: ["Ctrl / ⌘", "Z"], label: "Undo" },
      { keys: ["Ctrl / ⌘", "Shift", "Z"], label: "Redo" },
      { keys: ["Ctrl / ⌘", "D"], label: "Duplicate selected node" },
      { keys: ["Delete", "Backspace"], label: "Delete selection" },
      { keys: ["Esc"], label: "Clear selection" },
    ],
  },
  {
    label: "Global",
    shortcuts: [{ keys: ["?"], label: "Open keyboard shortcuts" }],
  },
] as const satisfies readonly ShortcutGroup[];

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

export function KeyboardShortcutsDialog({ onReplayTour }: { readonly onReplayTour: () => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.key !== "?" ||
        isEditableTarget(event.target)
      ) {
        return;
      }

      event.preventDefault();
      setOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleReplayTour = useCallback(() => {
    onReplayTour();
    setOpen(false);
  }, [onReplayTour]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
          />
        }
      >
        <Keyboard className="size-4" aria-hidden="true" />
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Move faster on the canvas. Shortcuts are ignored while you are typing in a field.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.label} aria-labelledby={`shortcuts-${group.label}`}>
              <h3
                id={`shortcuts-${group.label}`}
                className="mb-2 font-mono text-[11px] tracking-wider text-muted-foreground uppercase"
              >
                {group.label}
              </h3>
              <dl className="grid gap-1.5">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.label}
                    className="flex items-center justify-between gap-4 rounded-md px-2 py-1.5 hover:bg-muted/50"
                  >
                    <dt className="text-sm text-muted-foreground">{shortcut.label}</dt>
                    <dd className="flex shrink-0 items-center gap-1">
                      {shortcut.keys.map((key) => (
                        <kbd
                          key={key}
                          className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground"
                        >
                          {key}
                        </kbd>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={handleReplayTour}>
            <Sparkles className="size-4" aria-hidden="true" />
            Replay tour
          </Button>
          <DialogClose render={<Button />}>Got it</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
