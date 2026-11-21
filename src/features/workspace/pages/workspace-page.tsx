import { useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useParams } from "react-router";

import {
  ArchitectureCanvas,
  ComponentPalette,
  InspectorPanel,
  useDesignShortcuts,
  useDesignStore,
} from "@/features/architecture";
import { starterArchitectureFor } from "@/features/challenges";

import { WorkspaceMetricsBar } from "../components/workspace-metrics-bar";
import { WorkspaceTopbar } from "../components/workspace-topbar";

const CHALLENGE_TITLES: Record<string, string> = {
  "personal-blog": "Personal Blog / Portfolio",
  "url-shortener": "URL Shortener",
};

type WorkspaceEditorProps = {
  readonly challengeId: string;
  readonly title: string;
};

function WorkspaceEditor({ challengeId, title }: WorkspaceEditorProps) {
  const loadArchitecture = useDesignStore((state) => state.loadArchitecture);

  useState(() => {
    loadArchitecture(starterArchitectureFor(challengeId));
    return true;
  });

  useDesignShortcuts();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceTopbar title={title} />

      <ReactFlowProvider>
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)_320px]">
          <ComponentPalette />
          <ArchitectureCanvas />
          <InspectorPanel />
        </div>
      </ReactFlowProvider>

      <WorkspaceMetricsBar />
    </div>
  );
}

export function WorkspacePage() {
  const { id = "unknown" } = useParams();
  const title = CHALLENGE_TITLES[id] ?? "Untitled challenge";

  return <WorkspaceEditor key={id} challengeId={id} title={title} />;
}
