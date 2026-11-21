import { Compass } from "lucide-react";
import { Link } from "react-router";

import { Button } from "@/shared/ui/button";

export function NotFoundPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <span className="grid size-12 place-items-center rounded-xl border border-border bg-card text-primary">
        <Compass className="size-5" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Nothing routes here</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        That path is not part of the lab. Head back to the challenge hub and pick a target.
      </p>
      <Button className="mt-6" nativeButton={false} render={<Link to="/" />}>
        Back to challenges
      </Button>
    </div>
  );
}
