import { useEffect } from "react";

import { useDesignStore } from "../store/design-store";

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

export function useDesignShortcuts(enabled = true): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!enabled || event.defaultPrevented || isEditableTarget(event.target)) {
        return;
      }

      const store = useDesignStore.getState();
      const modifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (modifier && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          store.redo();
        } else {
          store.undo();
        }
        return;
      }

      if (modifier && key === "y") {
        event.preventDefault();
        store.redo();
        return;
      }

      if (modifier && key === "d") {
        if (store.selection?.type !== "node") {
          return;
        }

        event.preventDefault();
        store.duplicateSelectedNode();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (!store.selection) {
          return;
        }

        event.preventDefault();
        if (store.selection.type === "node") {
          store.removeNode(store.selection.id);
        } else {
          store.removeEdge(store.selection.id);
        }
        return;
      }

      if (event.key === "Escape") {
        store.clearSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled]);
}
