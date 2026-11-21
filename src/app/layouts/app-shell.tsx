import { Suspense } from "react";
import { NavLink, Outlet } from "react-router";

import { ThemePicker } from "@/features/settings";

import { AppLogo } from "./app-logo";
import { AppNav } from "./app-nav";
import { PageLoader } from "./page-loader";

export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur">
        <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
          <NavLink
            to="/"
            className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label="ScaleLab home"
          >
            <AppLogo />
          </NavLink>

          <div className="ml-2">
            <AppNav />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-full border border-border px-2 py-0.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase sm:inline">
              local-first
            </span>
            <ThemePicker />
          </div>
        </div>

        <div className="border-t px-4 py-1.5">
          <AppNav compact />
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="border-t border-border/60 px-4 py-3 text-center text-xs text-muted-foreground sm:px-6">
        ScaleLab is a learning model, not a benchmark. Everything stays in your browser.
      </footer>
    </div>
  );
}
