import { useCallback, useMemo, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useParams } from "react-router";

import {
  ArchitectureCanvas,
  ComponentPalette,
  InspectorPanel,
  selectArchitecture,
  useDesignShortcuts,
  useDesignStore,
  type EdgeId,
  type NodeHealth,
  type NodeId,
} from "@/features/architecture";
import { runConfigFor, starterArchitectureFor } from "@/features/challenges";
import { LiveMetricsPanel, ParticleLayer, RunOverlay } from "@/features/playback";
import { isSimSpeed, useSettingsStore, type SimSpeed } from "@/features/settings";
import {
  selectRunOutcome,
  selectRunStatus,
  selectRunStep,
  useRunSimulation,
  useRunStore,
} from "@/features/simulation";

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
  const architecture = useDesignStore(selectArchitecture);
  const loadArchitecture = useDesignStore((state) => state.loadArchitecture);
  const resetRun = useRunStore((state) => state.resetRun);
  const status = useRunStore(selectRunStatus);
  const step = useRunStore(selectRunStep);
  const outcome = useRunStore(selectRunOutcome);
  const { startRun, stopRun, setRunSpeed } = useRunSimulation();
  const simSpeed = useSettingsStore((state) => state.settings.simSpeed);
  const setSimSpeed = useSettingsStore((state) => state.setSimSpeed);
  const [overlayHidden, setOverlayHidden] = useState(false);

  useState(() => {
    loadArchitecture(starterArchitectureFor(challengeId));
    resetRun();
    return true;
  });

  const runConfig = useMemo(() => runConfigFor(challengeId), [challengeId]);
  const running = status === "running";

  const nodeHealthById = useMemo<ReadonlyMap<NodeId, NodeHealth> | undefined>(() => {
    if (!step) {
      return undefined;
    }

    return new Map(step.nodes.map((node) => [node.nodeId, node]));
  }, [step]);

  const edgeFlowById = useMemo<ReadonlyMap<EdgeId, number> | undefined>(() => {
    if (!step) {
      return undefined;
    }

    return new Map(step.edges.map((edge) => [edge.edgeId, edge.rps]));
  }, [step]);

  const failedOutcome = outcome?.status === "failed" ? outcome : null;
  const rootCauseLabel = useMemo(() => {
    if (!failedOutcome) {
      return "Unknown component";
    }

    return (
      architecture.nodes.find((node) => node.id === failedOutcome.rootCauseNodeId)?.label ??
      "Unknown component"
    );
  }, [architecture.nodes, failedOutcome]);

  const handleRun = useCallback(() => {
    setOverlayHidden(false);
    startRun(architecture, runConfig, simSpeed);
  }, [architecture, runConfig, simSpeed, startRun]);

  const handleStop = useCallback(() => {
    stopRun();
  }, [stopRun]);

  const handleSpeedChange = useCallback(
    (speed: SimSpeed) => {
      if (!isSimSpeed(speed)) {
        return;
      }

      setSimSpeed(speed);
      setRunSpeed(speed);
    },
    [setRunSpeed, setSimSpeed],
  );

  const handleDismissOverlay = useCallback(() => setOverlayHidden(true), []);

  useDesignShortcuts(!running);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceTopbar
        title={title}
        status={status}
        speed={simSpeed}
        onRun={handleRun}
        onStop={handleStop}
        onSpeedChange={handleSpeedChange}
      />

      <ReactFlowProvider>
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[248px_minmax(0,1fr)_320px]">
          <ComponentPalette disabled={running} />
          <ArchitectureCanvas
            nodeHealthById={nodeHealthById}
            edgeFlowById={edgeFlowById}
            crowdUsers={step?.metrics.users}
            locked={running}
            flowing={running}
            overlay={
              <>
                <ParticleLayer />
                {failedOutcome && !overlayHidden ? (
                  <RunOverlay
                    outcome={failedOutcome}
                    rootCauseLabel={rootCauseLabel}
                    onRunAgain={handleRun}
                    onDismiss={handleDismissOverlay}
                  />
                ) : null}
              </>
            }
          />
          <InspectorPanel locked={running} />
        </div>
      </ReactFlowProvider>

      <LiveMetricsPanel
        p95SloMs={runConfig.requirements.latencyP95Ms}
        maxErrorRatio={runConfig.requirements.maxErrorRatio}
      />
    </div>
  );
}

export function WorkspacePage() {
  const { id = "unknown" } = useParams();
  const title = CHALLENGE_TITLES[id] ?? "Untitled challenge";

  return <WorkspaceEditor key={id} challengeId={id} title={title} />;
}
