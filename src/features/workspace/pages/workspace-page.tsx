import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { useParams } from "react-router";

import {
  ArchitectureCanvas,
  ComponentPalette,
  InspectorPanel,
  selectArchitecture,
  useDesignShortcuts,
  useDesignStore,
  type Architecture,
  type EdgeId,
  type NodeHealth,
  type NodeId,
} from "@/features/architecture";
import {
  challengeOrFallback,
  referenceArchitectureFor,
  runConfigFor,
  starterArchitectureFor,
} from "@/features/challenges";
import { FailureReportDialog, diagnoseFailure, type FailureDiagnosis } from "@/features/diagnosis";
import { LiveMetricsPanel, ParticleLayer } from "@/features/playback";
import {
  ResultDialog,
  attemptFromResult,
  selectAttempts,
  useAttemptStore,
  type AttemptRecord,
  type AttemptScore,
} from "@/features/progress";
import { isSimSpeed, useSettingsStore, type SimSpeed } from "@/features/settings";
import {
  selectRunHistory,
  selectRunResult,
  selectRunStatus,
  selectRunStep,
  useRunSimulation,
  useRunStore,
  type RunResult,
} from "@/features/simulation";

import { WorkspaceTopbar } from "../components/workspace-topbar";

type DialogKind = "result" | "failure" | null;

type RunReport = {
  readonly result: RunResult;
  readonly score: AttemptScore;
  readonly attempt: AttemptRecord;
  readonly diagnosis: FailureDiagnosis | null;
};

type WorkspaceEditorProps = {
  readonly challengeId: string;
};

function WorkspaceEditor({ challengeId }: WorkspaceEditorProps) {
  const challenge = useMemo(() => challengeOrFallback(challengeId), [challengeId]);
  const architecture = useDesignStore(selectArchitecture);
  const loadArchitecture = useDesignStore((state) => state.loadArchitecture);
  const resetRun = useRunStore((state) => state.resetRun);
  const status = useRunStore(selectRunStatus);
  const step = useRunStore(selectRunStep);
  const result = useRunStore(selectRunResult);
  const history = useRunStore(selectRunHistory);
  const attempts = useAttemptStore(selectAttempts);
  const addAttempt = useAttemptStore((state) => state.addAttempt);
  const { startRun, stopRun, setRunSpeed } = useRunSimulation();
  const simSpeed = useSettingsStore((state) => state.settings.simSpeed);
  const setSimSpeed = useSettingsStore((state) => state.setSimSpeed);
  const [report, setReport] = useState<RunReport | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const runArchitectureRef = useRef<Architecture>(architecture);
  const recordedResultRef = useRef<RunResult | null>(null);

  useState(() => {
    loadArchitecture(starterArchitectureFor(challenge.id));
    resetRun();
    return true;
  });

  const runConfig = useMemo(() => runConfigFor(challenge.id), [challenge.id]);
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

  const failedAttempts = useMemo(
    () =>
      attempts.filter((attempt) => attempt.challengeId === challenge.id && attempt.stars === 0)
        .length,
    [attempts, challenge.id],
  );

  useEffect(() => {
    if (!result || recordedResultRef.current === result) {
      return;
    }

    recordedResultRef.current = result;
    const architectureAtRun = runArchitectureRef.current;
    const diagnosis =
      result.outcome.status === "failed"
        ? diagnoseFailure(architectureAtRun, challenge.requirements, result)
        : null;
    const scored = attemptFromResult({
      challengeId: challenge.id,
      architecture: architectureAtRun,
      requirements: challenge.requirements,
      maxUsersSustained: result.maxUsersSustained,
      costUsd: result.monthlyCostUsd,
      ...(diagnosis === null ? {} : { failureSummary: diagnosis.headline }),
    });

    addAttempt(scored.attempt);
    setReport({
      result,
      score: scored.score,
      attempt: scored.attempt,
      diagnosis,
    });
    setDialog(result.outcome.status === "passed" ? "result" : "failure");
  }, [addAttempt, challenge.id, challenge.requirements, result]);

  const handleRun = useCallback(() => {
    setDialog(null);
    setReport(null);
    runArchitectureRef.current = architecture;
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

  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setDialog(null);
    }
  }, []);

  const handleEditDesign = useCallback(() => {
    setDialog(null);
  }, []);

  const handleShowSampleSolution = useCallback(() => {
    loadArchitecture(referenceArchitectureFor(challenge.id));
    resetRun();
    setReport(null);
    setDialog(null);
  }, [challenge.id, loadArchitecture, resetRun]);

  useDesignShortcuts(!running);

  const failedOutcome = report?.result.outcome.status === "failed" ? report.result.outcome : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <WorkspaceTopbar
        challenge={challenge}
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
            overlay={<ParticleLayer />}
          />
          <InspectorPanel locked={running} />
        </div>
      </ReactFlowProvider>

      <LiveMetricsPanel
        p95SloMs={runConfig.requirements.latencyP95Ms}
        maxErrorRatio={runConfig.requirements.maxErrorRatio}
      />

      {report?.result.outcome.status === "passed" ? (
        <ResultDialog
          open={dialog === "result"}
          challengeTitle={challenge.title}
          requirements={challenge.requirements}
          score={report.score}
          maxUsersSustained={report.attempt.maxUsersSustained}
          costUsd={report.attempt.costUsd}
          onOpenChange={handleDialogOpenChange}
          onRunAgain={handleRun}
          onEditDesign={handleEditDesign}
        />
      ) : null}

      {report?.diagnosis && failedOutcome ? (
        <FailureReportDialog
          open={dialog === "failure"}
          challengeTitle={challenge.title}
          requirements={challenge.requirements}
          diagnosis={report.diagnosis}
          outcome={failedOutcome}
          finalStep={report.result.finalStep}
          history={history}
          hints={challenge.hints}
          failedAttempts={failedAttempts}
          canShowSample={failedAttempts >= 3}
          onOpenChange={handleDialogOpenChange}
          onRunAgain={handleRun}
          onEditDesign={handleEditDesign}
          onShowSampleSolution={handleShowSampleSolution}
        />
      ) : null}
    </div>
  );
}

export function WorkspacePage() {
  const { id = "unknown" } = useParams();

  return <WorkspaceEditor key={id} challengeId={id} />;
}
