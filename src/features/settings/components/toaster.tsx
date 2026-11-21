import type { CSSProperties } from "react";
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import { useSettingsStore } from "../store/app-store";
import { THEMES } from "../themes";

const TOAST_ICONS = {
  success: <CircleCheckIcon className="size-4" />,
  info: <InfoIcon className="size-4" />,
  warning: <TriangleAlertIcon className="size-4" />,
  error: <OctagonXIcon className="size-4" />,
  loading: <Loader2Icon className="size-4 animate-spin" />,
};

const TOASTER_STYLE = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--border-radius": "var(--radius)",
} as CSSProperties;

const TOAST_OPTIONS = {
  classNames: {
    toast: "cn-toast",
  },
};

export function Toaster(props: ToasterProps) {
  const themeId = useSettingsStore((state) => state.settings.theme);
  const isDark = THEMES.find((theme) => theme.id === themeId)?.dark ?? true;

  return (
    <Sonner
      theme={isDark ? "dark" : "light"}
      className="toaster group"
      icons={TOAST_ICONS}
      style={TOASTER_STYLE}
      toastOptions={TOAST_OPTIONS}
      {...props}
    />
  );
}
