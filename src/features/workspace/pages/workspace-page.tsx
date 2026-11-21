import { useParams } from "react-router";

import { WorkspaceCanvas } from "../components/workspace-canvas";
import { WorkspaceInspector } from "../components/workspace-inspector";
import { WorkspaceMetricsBar } from "../components/workspace-metrics-bar";
import { WorkspacePalette } from "../components/workspace-palette";
import { WorkspaceTopbar } from "../components/workspace-topbar";

const CHALLENGE_TITLES: Record<string, string> = {
  "personal-blog": "Personal Blog / Portfolio",
  "url-shortener": "URL Shortener",
};

export function WorkspacePage() {
  const { id = "unknown" } = useParams();
  const title = CHALLENGE_TITLES[id] ?? "Untitled challenge";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceTopbar title={title} />

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_1fr_280px]">
        <WorkspacePalette />
        <WorkspaceCanvas />
        <WorkspaceInspector />
      </div>

      <WorkspaceMetricsBar />
    </div>
  );
}
