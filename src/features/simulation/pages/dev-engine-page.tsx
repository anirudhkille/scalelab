import { FlaskConical } from "lucide-react";

import { PageMeta } from "@/shared/seo";
import { Badge } from "@/shared/ui/badge";
import { PlaceholderPage } from "@/shared/ui/placeholder-page";

export function DevEnginePage() {
  return (
    <>
      <PageMeta
        title="Engine Playground — ScaleLab"
        description="A headless engine playground for sweeping load and tuning ScaleLab simulation constants."
        path="/dev/engine"
        noIndex
      />
      <PlaceholderPage
        icon={FlaskConical}
        eyebrow="Developer tools"
        title="Engine playground"
        description="A headless harness for tuning constant values. Drop an architecture in, sweep user counts, and read the max-sustained number without touching the UI."
      >
        <Badge variant="outline" className="font-mono text-[10px]">
          /dev/engine · M2 data models
        </Badge>
      </PlaceholderPage>
    </>
  );
}
