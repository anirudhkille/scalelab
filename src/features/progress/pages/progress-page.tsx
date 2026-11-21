import { LineChart } from "lucide-react";

import { PlaceholderPage } from "@/shared/ui/placeholder-page";
import { Badge } from "@/shared/ui/badge";

export function ProgressPage() {
  return (
    <PlaceholderPage
      icon={LineChart}
      eyebrow="Milestone 6"
      title="Progress & attempts"
      description="Stars, best scores, attempt history and local data export/import land once the simulation engine is in place. Nothing leaves this browser."
    >
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">0 stars</Badge>
        <Badge variant="outline">0 attempts</Badge>
        <Badge variant="outline">no streak yet</Badge>
      </div>
    </PlaceholderPage>
  );
}
