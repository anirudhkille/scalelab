import { toast } from "sonner";
import { createJSONStorage, type PersistStorage, type StateStorage } from "zustand/middleware";

const CORRUPT_BACKUP_PREFIX = "scalelab:v1:corrupt";
const QUOTA_TOAST_INTERVAL_MS = 4000;

let lastQuotaToastAt = 0;

function isQuotaExceededError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error.message.toLowerCase().includes("quota")
  );
}

export const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return globalThis.localStorage.getItem(name);
    } catch {
      return null;
    }
  },

  setItem: (name, value) => {
    try {
      globalThis.localStorage.setItem(name, value);
    } catch (error) {
      const now = Date.now();

      if (isQuotaExceededError(error)) {
        if (now - lastQuotaToastAt > QUOTA_TOAST_INTERVAL_MS) {
          lastQuotaToastAt = now;
          toast.error("Local storage is full", {
            description: "Export your progress, then reset old data to keep saving.",
          });
        }
        return;
      }

      toast.error("Could not save local data", {
        description: "The browser blocked a storage write. Your current session still works.",
      });
    }
  },

  removeItem: (name) => {
    try {
      globalThis.localStorage.removeItem(name);
    } catch {
      // A blocked remove should not crash the app.
    }
  },
};

export function safeJSONStorage<T>(): PersistStorage<T> {
  const storage = createJSONStorage<T>(() => safeLocalStorage);

  if (storage === undefined) {
    throw new Error("JSON storage is unavailable");
  }

  return storage;
}

/**
 * Copy a corrupt persisted blob to a timestamped backup key, then remove it so
 * the next hydration starts from defaults.
 */
export function backupCorruptEntry(name: string): boolean {
  if (typeof globalThis.localStorage === "undefined") {
    return false;
  }

  try {
    const raw = globalThis.localStorage.getItem(name);

    if (raw === null || raw.length === 0) {
      return false;
    }

    const backupKey = `${CORRUPT_BACKUP_PREFIX}-${Date.now()}`;
    globalThis.localStorage.setItem(backupKey, raw);
    globalThis.localStorage.removeItem(name);
    return true;
  } catch {
    return false;
  }
}
