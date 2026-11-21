import { LoaderCircle } from "lucide-react";

export function PageLoader() {
  return (
    <output aria-live="polite" className="grid min-h-[50dvh] flex-1 place-items-center px-6">
      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        Loading workspace…
      </span>
    </output>
  );
}
