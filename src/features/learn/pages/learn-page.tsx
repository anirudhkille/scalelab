import { BookOpen } from "lucide-react";

import { PlaceholderPage } from "@/shared/ui/placeholder-page";

export function LearnPage() {
  return (
    <PlaceholderPage
      icon={BookOpen}
      eyebrow="Phase 2"
      title="Concept cards"
      description="Short explainers for each component — what it does, when to reach for it, and the trade-off it buys you. The first pass ships with the MVP; this library fills in afterwards."
    />
  );
}
