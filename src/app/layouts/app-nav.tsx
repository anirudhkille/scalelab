import { useCallback } from "react";
import { BookOpen, LayoutGrid, LineChart } from "lucide-react";
import { NavLink } from "react-router";

import { cn } from "@/shared/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Challenges", icon: LayoutGrid, end: true },
  { to: "/progress", label: "Progress", icon: LineChart, end: false },
  { to: "/learn", label: "Learn", icon: BookOpen, end: false },
] as const;

export function AppNav({ compact = false }: { compact?: boolean }) {
  const linkClassName = useCallback(
    ({ isActive }: { isActive: boolean }) =>
      cn(
        "inline-flex items-center rounded-md transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        compact ? "gap-1.5 px-2 py-1 text-xs" : "gap-1.5 px-2.5 py-1.5 text-sm",
        isActive
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      ),
    [compact],
  );

  return (
    <nav
      aria-label={compact ? "Primary mobile" : "Primary"}
      className={cn("flex items-center gap-1", compact ? "md:hidden" : "hidden md:flex md:gap-0.5")}
    >
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} className={linkClassName}>
          <item.icon className={compact ? "size-3.5" : "size-4"} aria-hidden="true" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
