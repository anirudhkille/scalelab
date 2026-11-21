import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
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
import type { NodeHealth } from "../model/health";
import type { Architecture } from "../model/schema";
import { isNodeKind, type EdgeId, type NodeId } from "../model/types";
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

type ArchitectureCanvasProps = {
  readonly nodeHealthById?: ReadonlyMap<NodeId, NodeHealth>;
  readonly edgeFlowById?: ReadonlyMap<EdgeId, number>;
  readonly crowdUsers?: number;
  readonly locked?: boolean;
  readonly flowing?: boolean;
  readonly overlay?: ReactNode;
};

export function ArchitectureCanvas({
  nodeHealthById,
  edgeFlowById,
  crowdUsers,
  locked = false,
  flowing = false,
  overlay,
}: ArchitectureCanvasProps) {
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
      architecture.nodes.map((node) => {
        const health = nodeHealthById?.get(node.id);
        const showCrowd = node.params.kind === "clients" && crowdUsers !== undefined;

        return {
          id: node.id,
          type: "architecture",
          position: node.position,
          data: {
            label: node.label,
            params: node.params,
            ...(health ? { health } : {}),
            ...(showCrowd ? { crowdUsers } : {}),
          },
          selected: selection?.type === "node" && selection.id === node.id,
          deletable: !locked && node.params.kind !== "clients",
        };
      }),
    [architecture.nodes, crowdUsers, locked, nodeHealthById, selection],
  );

  const flowEdges = useMemo<ArchitectureFlowEdge[]>(
    () =>
      architecture.edges.map((edge) => {
        const selected = selection?.type === "edge" && selection.id === edge.id;
        const flowRps = edgeFlowById?.get(edge.id) ?? 0;

        return {
          id: edge.id,
          type: "architecture",
          source: edge.source,
          target: edge.target,
          selected,
          deletable: !locked,
          data: { flowRps, active: flowing && flowRps > 0 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color: selected ? "var(--edge-active)" : "var(--edge)",
          },
        };
      }),
    [architecture.edges, edgeFlowById, flowing, locked, selection],
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
      if (locked || !connection.source || !connection.target) {
        return;
      }

      const id = addEdge(asNodeId(connection.source), asNodeId(connection.target));

      if (!id) {
        toast.error("That connection is not valid. Check for duplicates or self-links.");
      }
    },
    [addEdge, locked],
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

  const handleDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (locked) {
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    [locked],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (locked) {
        return;
      }

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
    [addNode, locked, screenToFlowPosition],
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
        nodesDraggable={!locked}
        nodesConnectable={!locked}
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
          {locked
            ? "Run in progress. The design is locked until playback ends."
            : "Drag a component in. Connect the handles. Select to tune it."}
        </Panel>
        <Panel position="bottom-right">
          <ValidationPanel issues={issues} />
        </Panel>
      </ReactFlow>

      {overlay ? <div className="pointer-events-none absolute inset-0 z-10">{overlay}</div> : null}
    </div>
  );
}
