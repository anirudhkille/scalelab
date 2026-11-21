import { useEffect } from "react";

import { useSettingsStore } from "../store/app-store";

/** Keeps <html data-theme> and color-scheme in sync with the settings store. */
export function useApplyTheme(): void {
  const theme = useSettingsStore((state) => state.settings.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme !== "paper");
    root.style.colorScheme = theme === "paper" ? "light" : "dark";

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const background = getComputedStyle(root).getPropertyValue("--background").trim();
      if (background) meta.setAttribute("content", background);
    }
  }, [theme]);
}

/** Applies the user's reduced-motion preference to <html>. */
export function useApplyReducedMotion(): void {
  const preference = useSettingsStore((state) => state.settings.reducedMotion);

  useEffect(() => {
    const root = document.documentElement;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const apply = () => {
      const reduce = preference === "on" || (preference === "system" && motionQuery.matches);
      root.dataset.reducedMotion = reduce ? "true" : "false";
    };

    apply();
    motionQuery.addEventListener("change", apply);

    return () => motionQuery.removeEventListener("change", apply);
  }, [preference]);
}
