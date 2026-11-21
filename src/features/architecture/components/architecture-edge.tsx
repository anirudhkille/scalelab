import { useMemo } from "react";
import { BaseEdge, getSmoothStepPath, type Edge, type EdgeProps } from "@xyflow/react";

export type ArchitectureEdgeData = {
  readonly flowRps?: number;
  readonly active?: boolean;
};

export type ArchitectureFlowEdge = Edge<ArchitectureEdgeData, "architecture">;

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
  data,
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

  const flowRps = data?.flowRps ?? 0;
  const active = data?.active ?? false;

  const edgeStyle = useMemo(() => {
    const flowWidth = 1.2 + Math.log10(1 + flowRps) * 0.55;
    const strokeWidth = active ? Math.min(4, flowWidth) : selected ? 2.25 : 1.5;

    return {
      stroke: selected ? "var(--edge-active)" : "var(--edge)",
      strokeWidth,
      strokeDasharray: active || !selected ? "5 5" : undefined,
    };
  }, [active, flowRps, selected]);

  return (
    <BaseEdge
      id={id}
      path={path}
      markerEnd={markerEnd}
      interactionWidth={24}
      style={edgeStyle}
      className={active ? "scalelab-edge-flow" : undefined}
    />
  );
}

export const ArchitectureEdge = ArchitectureEdgeComponent;
