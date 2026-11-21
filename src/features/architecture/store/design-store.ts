import { create } from "zustand";

import {
  COMPONENT_CATALOG,
  architectureMonthlyCostUsd,
  defaultComponentParams,
} from "../model/catalog";
import { newEdgeId, newNodeId } from "../model/ids";
import {
  architectureSchema,
  componentParamsSchema,
  type ArchEdge,
  type ArchNode,
  type Architecture,
  type ComponentParams,
} from "../model/schema";
import {
  DEFAULT_REGION,
  DEFAULT_ZONE,
  type EdgeId,
  type NodeId,
  type NodeKind,
  type RegionId,
  type Vec2,
  type ZoneId,
} from "../model/types";

export type DesignSelection =
  | { readonly type: "node"; readonly id: NodeId }
  | { readonly type: "edge"; readonly id: EdgeId }
  | null;

export type DesignState = {
  architecture: Architecture;
  selection: DesignSelection;
  past: Architecture[];
  future: Architecture[];
  loadArchitecture: (architecture: Architecture) => void;
  addNode: (kind: NodeKind, position: Vec2) => NodeId | null;
  addEdge: (source: NodeId, target: NodeId) => EdgeId | null;
  moveNode: (id: NodeId, position: Vec2) => void;
  commitHistory: (snapshot: Architecture) => void;
  updateNodeLabel: (id: NodeId, label: string) => boolean;
  updateNodeParams: (id: NodeId, params: ComponentParams) => boolean;
  updateNodePlacement: (id: NodeId, region: RegionId, zone: ZoneId) => boolean;
  removeNode: (id: NodeId) => boolean;
  removeEdge: (id: EdgeId) => boolean;
  duplicateSelectedNode: () => NodeId | null;
  selectNode: (id: NodeId) => void;
  selectEdge: (id: EdgeId) => void;
  clearSelection: () => void;
  undo: () => void;
  redo: () => void;
};

const EMPTY_ARCHITECTURE: Architecture = {
  nodes: [],
  edges: [],
  schemaVersion: 1,
};

const MAX_HISTORY = 50;

function historyFor(state: DesignState, architecture: Architecture) {
  return {
    past: [...state.past, state.architecture].slice(-MAX_HISTORY),
    future: [] as Architecture[],
    architecture,
  };
}

export const useDesignStore = create<DesignState>()((set, get) => ({
  architecture: EMPTY_ARCHITECTURE,
  selection: null,
  past: [],
  future: [],

  loadArchitecture: (architecture) => {
    const next = architectureSchema.parse(architecture);

    set({
      architecture: next,
      selection: null,
      past: [],
      future: [],
    });
  },

  addNode: (kind, position) => {
    const state = get();

    if (
      kind === "clients" &&
      state.architecture.nodes.some((node) => node.params.kind === "clients")
    ) {
      return null;
    }

    const nextId = newNodeId();
    const count = state.architecture.nodes.filter((node) => node.params.kind === kind).length;
    const label =
      count === 0 ? COMPONENT_CATALOG[kind].label : `${COMPONENT_CATALOG[kind].label} ${count + 1}`;
    const node: ArchNode = {
      id: nextId,
      label,
      position: { x: position.x, y: position.y },
      region: DEFAULT_REGION,
      zone: DEFAULT_ZONE,
      params: defaultComponentParams(kind),
    };

    set({
      ...historyFor(state, {
        ...state.architecture,
        nodes: [...state.architecture.nodes, node],
      }),
      selection: { type: "node", id: nextId },
    });

    return nextId;
  },

  addEdge: (source, target) => {
    const state = get();
    const sourceNode = state.architecture.nodes.find((node) => node.id === source);
    const targetNode = state.architecture.nodes.find((node) => node.id === target);

    if (!sourceNode || !targetNode || source === target) {
      return null;
    }

    if (targetNode.params.kind === "clients") {
      return null;
    }

    const duplicate = state.architecture.edges.some(
      (edge) => edge.source === source && edge.target === target,
    );

    if (duplicate) {
      return null;
    }

    const nextId = newEdgeId();
    const edge: ArchEdge = { id: nextId, source, target };

    set({
      ...historyFor(state, {
        ...state.architecture,
        edges: [...state.architecture.edges, edge],
      }),
      selection: { type: "edge", id: nextId },
    });

    return nextId;
  },

  moveNode: (id, position) => {
    set((state) => ({
      architecture: {
        ...state.architecture,
        nodes: state.architecture.nodes.map((node) =>
          node.id === id ? { ...node, position: { x: position.x, y: position.y } } : node,
        ),
      },
    }));
  },

  commitHistory: (snapshot) => {
    const state = get();

    if (state.architecture === snapshot) {
      return;
    }

    set({
      past: [...state.past, snapshot].slice(-MAX_HISTORY),
      future: [],
    });
  },

  updateNodeLabel: (id, label) => {
    const state = get();
    const trimmed = label.trim();
    const node = state.architecture.nodes.find((item) => item.id === id);

    if (!node || trimmed.length === 0 || node.label === trimmed) {
      return false;
    }

    set(
      historyFor(state, {
        ...state.architecture,
        nodes: state.architecture.nodes.map((item) =>
          item.id === id ? Object.assign({}, item, { label: trimmed }) : item,
        ),
      }),
    );

    return true;
  },

  updateNodeParams: (id, params) => {
    const state = get();
    const parsed = componentParamsSchema.safeParse(params);
    const node = state.architecture.nodes.find((item) => item.id === id);

    if (!parsed.success || !node || node.params.kind !== parsed.data.kind) {
      return false;
    }

    set(
      historyFor(state, {
        ...state.architecture,
        nodes: state.architecture.nodes.map((item) =>
          item.id === id ? Object.assign({}, item, { params: parsed.data }) : item,
        ),
      }),
    );

    return true;
  },

  updateNodePlacement: (id, region, zone) => {
    const state = get();
    const node = state.architecture.nodes.find((item) => item.id === id);

    if (!node || (node.region === region && node.zone === zone)) {
      return false;
    }

    set(
      historyFor(state, {
        ...state.architecture,
        nodes: state.architecture.nodes.map((item) =>
          item.id === id ? Object.assign({}, item, { region, zone }) : item,
        ),
      }),
    );

    return true;
  },

  removeNode: (id) => {
    const state = get();
    const node = state.architecture.nodes.find((item) => item.id === id);

    if (!node || node.params.kind === "clients") {
      return false;
    }

    set({
      ...historyFor(state, {
        ...state.architecture,
        nodes: state.architecture.nodes.filter((item) => item.id !== id),
        edges: state.architecture.edges.filter((edge) => edge.source !== id && edge.target !== id),
      }),
      selection: null,
    });

    return true;
  },

  removeEdge: (id) => {
    const state = get();

    if (!state.architecture.edges.some((edge) => edge.id === id)) {
      return false;
    }

    set({
      ...historyFor(state, {
        ...state.architecture,
        edges: state.architecture.edges.filter((edge) => edge.id !== id),
      }),
      selection: null,
    });

    return true;
  },

  duplicateSelectedNode: () => {
    const state = get();

    if (state.selection?.type !== "node") {
      return null;
    }

    const source = state.architecture.nodes.find((node) => node.id === state.selection?.id);

    if (!source || source.params.kind === "clients") {
      return null;
    }

    const nextId = newNodeId();
    const duplicate: ArchNode = {
      ...source,
      id: nextId,
      label: `${source.label} copy`,
      position: { x: source.position.x + 32, y: source.position.y + 32 },
    };

    set({
      ...historyFor(state, {
        ...state.architecture,
        nodes: [...state.architecture.nodes, duplicate],
      }),
      selection: { type: "node", id: nextId },
    });

    return nextId;
  },

  selectNode: (id) => {
    if (!get().architecture.nodes.some((node) => node.id === id)) {
      return;
    }

    set({ selection: { type: "node", id } });
  },

  selectEdge: (id) => {
    if (!get().architecture.edges.some((edge) => edge.id === id)) {
      return;
    }

    set({ selection: { type: "edge", id } });
  },

  clearSelection: () => {
    set({ selection: null });
  },

  undo: () => {
    const state = get();
    const previous = state.past.at(-1);

    if (!previous) {
      return;
    }

    set({
      architecture: previous,
      selection: null,
      past: state.past.slice(0, -1),
      future: [state.architecture, ...state.future].slice(0, MAX_HISTORY),
    });
  },

  redo: () => {
    const state = get();
    const next = state.future[0];

    if (!next) {
      return;
    }

    set({
      architecture: next,
      selection: null,
      past: [...state.past, state.architecture].slice(-MAX_HISTORY),
      future: state.future.slice(1),
    });
  },
}));

export const selectArchitecture = (state: DesignState): Architecture => state.architecture;
export const selectSelection = (state: DesignState): DesignSelection => state.selection;

export const selectSelectedNode = (state: DesignState): ArchNode | null => {
  if (state.selection?.type !== "node") {
    return null;
  }

  return state.architecture.nodes.find((node) => node.id === state.selection?.id) ?? null;
};

export const selectSelectedEdge = (state: DesignState): ArchEdge | null => {
  if (state.selection?.type !== "edge") {
    return null;
  }

  return state.architecture.edges.find((edge) => edge.id === state.selection?.id) ?? null;
};

export const selectCostUsd = (state: DesignState): number =>
  architectureMonthlyCostUsd(state.architecture);

export const selectCanUndo = (state: DesignState): boolean => state.past.length > 0;
export const selectCanRedo = (state: DesignState): boolean => state.future.length > 0;
export const selectNodeCount = (state: DesignState): number => state.architecture.nodes.length;
export const selectEdgeCount = (state: DesignState): number => state.architecture.edges.length;
