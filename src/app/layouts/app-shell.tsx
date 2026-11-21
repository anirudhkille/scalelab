import { Suspense, useCallback, useState } from "react";
import { NavLink, Outlet } from "react-router";

import { ThemePicker, useSettingsStore } from "@/features/settings";

import { KeyboardShortcutsDialog } from "../components/keyboard-shortcuts-dialog";
import { OnboardingTour } from "../components/onboarding-tour";
import { AppLogo } from "./app-logo";
import { AppNav } from "./app-nav";
import { PageLoader } from "./page-loader";

export function AppShell() {
  const restartOnboarding = useSettingsStore((state) => state.restartOnboarding);
  const [tourKey, setTourKey] = useState(0);

  const handleReplayTour = useCallback(() => {
    restartOnboarding();
    setTourKey((current) => current + 1);
  }, [restartOnboarding]);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>

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
            <KeyboardShortcutsDialog onReplayTour={handleReplayTour} />
            <ThemePicker />
          </div>
        </div>

        <div className="border-t px-4 py-1.5">
          <AppNav compact />
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex min-h-0 flex-1 flex-col outline-none">
        <Suspense fallback={<PageLoader />}>
          <div className="flex min-h-0 flex-1 flex-col motion-safe:animate-in motion-safe:duration-200 motion-safe:fade-in-0">
            <Outlet />
          </div>
        </Suspense>
      </main>

      <footer className="border-t border-border/60 px-4 py-3 text-center text-xs text-muted-foreground sm:px-6">
        <div className="flex flex-col items-center justify-center gap-1 sm:flex-row sm:gap-2">
          <span>
            ScaleLab is a learning model, not a benchmark. Everything stays in your browser.
          </span>
          <span aria-hidden="true" className="hidden sm:inline">
            ·
          </span>
          <span>
            Built by{" "}
            <a
              href="https://anirudhkille.com"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Anirudh Kille
            </a>
          </span>
        </div>
      </footer>

      <OnboardingTour key={tourKey} />
    </div>
  );
}
