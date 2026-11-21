import { BookOpen, LayoutGrid, LineChart } from "lucide-react";
import { NavLink, Outlet } from "react-router";

import { ThemePicker } from "@/features/settings";
import { cn } from "@/shared/lib/utils";

import { AppLogo } from "./app-logo";

const NAV_ITEMS = [
  { to: "/", label: "Challenges", icon: LayoutGrid, end: true },
  { to: "/progress", label: "Progress", icon: LineChart, end: false },
  { to: "/learn", label: "Learn", icon: BookOpen, end: false },
] as const;

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

          <nav aria-label="Main" className="ml-2 hidden items-center gap-0.5 md:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors outline-none",
                    "focus-visible:ring-3 focus-visible:ring-ring/50",
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )
                }
              >
                <item.icon className="size-4" aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-full border border-border px-2 py-0.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase sm:inline">
              local-first
            </span>
            <ThemePicker />
          </div>
        </div>

        <nav aria-label="Main" className="flex items-center gap-1 border-t px-4 py-1.5 md:hidden">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              <item.icon className="size-3.5" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>

      <footer className="border-t border-border/60 px-4 py-3 text-center text-xs text-muted-foreground sm:px-6">
        ScaleLab is a learning model, not a benchmark. Everything stays in your browser.
      </footer>
    </div>
  );
}
