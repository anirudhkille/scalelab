import { useMemo } from "react";
import { BaseEdge, getSmoothStepPath, type Edge, type EdgeProps } from "@xyflow/react";

export type ArchitectureFlowEdge = Edge<Record<string, never>, "architecture">;

function ArchitectureEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  selected,
}: EdgeProps<ArchitectureFlowEdge>) {
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
    offset: 20,
  });

  const edgeStyle = useMemo(
    () => ({
      stroke: selected ? "var(--edge-active)" : "var(--edge)",
      strokeWidth: selected ? 2.25 : 1.5,
      strokeDasharray: selected ? undefined : "5 5",
    }),
    [selected],
  );

  return (
    <BaseEdge id={id} path={path} markerEnd={markerEnd} interactionWidth={24} style={edgeStyle} />
  );
}

export const ArchitectureEdge = ArchitectureEdgeComponent;
