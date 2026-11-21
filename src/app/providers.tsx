import type { ReactNode } from "react";

import { Toaster, useApplyReducedMotion, useApplyTheme } from "@/features/settings";
import { TooltipProvider } from "@/shared/ui/tooltip";

export function AppProviders({ children }: { children: ReactNode }) {
  useApplyTheme();
  useApplyReducedMotion();

  return (
    <TooltipProvider delay={250}>
      {children}
      <Toaster position="bottom-right" closeButton />
    </TooltipProvider>
  );
}
