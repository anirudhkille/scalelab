import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  MarkerType,
  Panel,
  ReactFlow,
  useReactFlow,
  useUpdateNodeInternals,
  type Connection,
  type OnEdgesChange,
  type OnNodesChange,
  type ReactFlowInstance,
} from "@xyflow/react";
import { toast } from "sonner";

import { asEdgeId, asNodeId } from "../model/ids";
import { validateArchitecture, type GraphIssue } from "../model/graph";
import { COMPONENT_DRAG_MIME, NODE_CARD_HEIGHT, NODE_CARD_WIDTH } from "../model/editor";
import type { Architecture } from "../model/schema";
import { isNodeKind } from "../model/types";
import { selectArchitecture, selectSelection, useDesignStore } from "../store/design-store";
import { ArchitectureEdge, type ArchitectureFlowEdge } from "./architecture-edge";
import { ArchitectureNode, type ArchitectureFlowNode } from "./architecture-node";
import { ValidationPanel } from "./validation-panel";

const NODE_TYPES = { architecture: ArchitectureNode };
const EDGE_TYPES = { architecture: ArchitectureEdge };
const CONNECTION_LINE_STYLE = { stroke: "var(--edge-active)", strokeWidth: 2 };
const SNAP_GRID: [number, number] = [16, 16];
const FIT_VIEW_OPTIONS = { padding: 0.2 };
const EMPTY_ISSUES: readonly GraphIssue[] = [];

export function ArchitectureCanvas() {
  const architecture = useDesignStore(selectArchitecture);
  const selection = useDesignStore(selectSelection);
  const addNode = useDesignStore((state) => state.addNode);
  const addEdge = useDesignStore((state) => state.addEdge);
  const moveNode = useDesignStore((state) => state.moveNode);
  const commitHistory = useDesignStore((state) => state.commitHistory);
  const removeNode = useDesignStore((state) => state.removeNode);
  const removeEdge = useDesignStore((state) => state.removeEdge);
  const selectNode = useDesignStore((state) => state.selectNode);
  const selectEdge = useDesignStore((state) => state.selectEdge);
  const clearSelection = useDesignStore((state) => state.clearSelection);
  const { screenToFlowPosition } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const dragSnapshotRef = useRef<Architecture | null>(null);

  const validation = useMemo(() => validateArchitecture(architecture), [architecture]);
  const issues = useMemo(() => (validation.ok ? EMPTY_ISSUES : validation.issues), [validation]);

  const flowNodes = useMemo<ArchitectureFlowNode[]>(
    () =>
      architecture.nodes.map((node) => ({
        id: node.id,
        type: "architecture",
        position: node.position,
        data: { label: node.label, params: node.params },
        selected: selection?.type === "node" && selection.id === node.id,
        deletable: node.params.kind !== "clients",
      })),
    [architecture.nodes, selection],
  );

  const flowEdges = useMemo<ArchitectureFlowEdge[]>(
    () =>
      architecture.edges.map((edge) => {
        const selected = selection?.type === "edge" && selection.id === edge.id;

        return {
          id: edge.id,
          type: "architecture",
          source: edge.source,
          target: edge.target,
          selected,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color: selected ? "var(--edge-active)" : "var(--edge)",
          },
        };
      }),
    [architecture.edges, selection],
  );

  useEffect(() => {
    if (architecture.nodes.length === 0) {
      return;
    }

    updateNodeInternals(architecture.nodes.map((node) => node.id));
  }, [architecture.nodes, updateNodeInternals]);

  const handleInit = useCallback(
    (instance: ReactFlowInstance<ArchitectureFlowNode, ArchitectureFlowEdge>) => {
      void instance.fitView(FIT_VIEW_OPTIONS);
    },
    [],
  );

  const handleNodesChange = useCallback<OnNodesChange<ArchitectureFlowNode>>(
    (changes) => {
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          moveNode(asNodeId(change.id), change.position);
        } else if (change.type === "remove") {
          removeNode(asNodeId(change.id));
        }
      }
    },
    [moveNode, removeNode],
  );

  const handleEdgesChange = useCallback<OnEdgesChange<ArchitectureFlowEdge>>(
    (changes) => {
      for (const change of changes) {
        if (change.type === "remove") {
          removeEdge(asEdgeId(change.id));
        }
      }
    },
    [removeEdge],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) {
        return;
      }

      const id = addEdge(asNodeId(connection.source), asNodeId(connection.target));

      if (!id) {
        toast.error("That connection is not valid. Check for duplicates or self-links.");
      }
    },
    [addEdge],
  );

  const handleNodeClick = useCallback(
    (_event: ReactMouseEvent, node: ArchitectureFlowNode) => selectNode(asNodeId(node.id)),
    [selectNode],
  );

  const handleEdgeClick = useCallback(
    (_event: ReactMouseEvent, edge: ArchitectureFlowEdge) => selectEdge(asEdgeId(edge.id)),
    [selectEdge],
  );

  const handleDragStart = useCallback(() => {
    dragSnapshotRef.current = useDesignStore.getState().architecture;
  }, []);

  const handleDragStop = useCallback(() => {
    const snapshot = dragSnapshotRef.current;
    dragSnapshotRef.current = null;

    if (snapshot) {
      commitHistory(snapshot);
    }
  }, [commitHistory]);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const kind = event.dataTransfer.getData(COMPONENT_DRAG_MIME);

      if (!isNodeKind(kind)) {
        return;
      }

      const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const id = addNode(kind, {
        x: point.x - NODE_CARD_WIDTH / 2,
        y: point.y - NODE_CARD_HEIGHT / 2,
      });

      if (!id) {
        toast.error(
          kind === "clients"
            ? "The design already has a traffic source."
            : "Could not add that component.",
        );
      }
    },
    [addNode, screenToFlowPosition],
  );

  return (
    <div
      data-scalelab-canvas
      className="relative h-full min-h-[420px] w-full bg-canvas-bg"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onInit={handleInit}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={clearSelection}
        onNodeDragStart={handleDragStart}
        onNodeDragStop={handleDragStop}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={CONNECTION_LINE_STYLE}
        deleteKeyCode={null}
        multiSelectionKeyCode={null}
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        minZoom={0.25}
        maxZoom={1.6}
        snapToGrid
        snapGrid={SNAP_GRID}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--canvas-grid)" />
        <Controls position="bottom-left" showInteractive={false} />
        <Panel
          position="top-left"
          className="rounded-lg border bg-card/90 px-3 py-2 text-[11px] text-muted-foreground shadow-sm backdrop-blur"
        >
          Drag a component in. Connect the handles. Select to tune it.
        </Panel>
        <Panel position="bottom-right">
          <ValidationPanel issues={issues} />
        </Panel>
      </ReactFlow>
    </div>
  );
}
