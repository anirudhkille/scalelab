import { beforeEach, describe, expect, it } from "vitest";

import {
  asEdgeId,
  asNodeId,
  defaultComponentParams,
  selectCanRedo,
  selectCanUndo,
  selectCostUsd,
  useDesignStore,
  type Architecture,
} from "@/features/architecture";

const CLIENT_ID = asNodeId("clients");
const APP_ID = asNodeId("app");
const EDGE_ID = asEdgeId("edge-clients-app");

function emptyArchitecture(): Architecture {
  return { nodes: [], edges: [], schemaVersion: 1 };
}

function sampleArchitecture(): Architecture {
  return {
    nodes: [
      {
        id: CLIENT_ID,
        label: "Clients",
        position: { x: 0, y: 0 },
        region: "us-east",
        zone: "a",
        params: defaultComponentParams("clients"),
      },
      {
        id: APP_ID,
        label: "App",
        position: { x: 100, y: 0 },
        region: "us-east",
        zone: "a",
        params: defaultComponentParams("appServer"),
      },
    ],
    edges: [{ id: EDGE_ID, source: CLIENT_ID, target: APP_ID }],
    schemaVersion: 1,
  };
}

function store() {
  return useDesignStore.getState();
}

function appNode() {
  return store().architecture.nodes.find((node) => node.id === APP_ID);
}

beforeEach(() => {
  store().loadArchitecture(emptyArchitecture());
});

describe("design store", () => {
  it("loads a fresh design and clears history", () => {
    store().loadArchitecture(sampleArchitecture());

    expect(store().architecture.nodes).toHaveLength(2);
    expect(selectCanUndo(store())).toBe(false);
    expect(selectCanRedo(store())).toBe(false);
    expect(store().selection).toBeNull();
  });

  it("adds nodes with unique labels and selects the new node", () => {
    const first = store().addNode("appServer", { x: 10, y: 20 });
    const second = store().addNode("appServer", { x: 30, y: 40 });

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(store().architecture.nodes.map((node) => node.label)).toEqual([
      "App server",
      "App server 2",
    ]);
    expect(store().selection).toEqual({ type: "node", id: second });
  });

  it("allows only one clients component", () => {
    const first = store().addNode("clients", { x: 0, y: 0 });

    expect(first).not.toBeNull();
    expect(store().addNode("clients", { x: 100, y: 0 })).toBeNull();
    expect(store().architecture.nodes).toHaveLength(1);
  });

  it("rejects self links, links into clients, and duplicate edges", () => {
    store().loadArchitecture(sampleArchitecture());

    expect(store().addEdge(APP_ID, APP_ID)).toBeNull();
    expect(store().addEdge(APP_ID, CLIENT_ID)).toBeNull();
    expect(store().addEdge(CLIENT_ID, APP_ID)).toBeNull();
    expect(store().architecture.edges).toHaveLength(1);
  });

  it("removes incident edges with a node but protects clients", () => {
    store().loadArchitecture(sampleArchitecture());

    expect(store().removeNode(APP_ID)).toBe(true);
    expect(store().architecture.nodes).toHaveLength(1);
    expect(store().architecture.edges).toHaveLength(0);

    store().loadArchitecture(sampleArchitecture());
    expect(store().removeNode(CLIENT_ID)).toBe(false);
    expect(store().architecture.nodes).toHaveLength(2);
  });

  it("duplicates the selected node with an offset", () => {
    store().loadArchitecture(sampleArchitecture());
    store().selectNode(APP_ID);

    const duplicateId = store().duplicateSelectedNode();
    const duplicate = store().architecture.nodes.find((node) => node.id === duplicateId);

    expect(duplicateId).not.toBeNull();
    expect(duplicate?.label).toBe("App copy");
    expect(duplicate?.position).toEqual({ x: 132, y: 32 });
    expect(store().selection).toEqual({ type: "node", id: duplicateId });
  });

  it("undoes and redoes adds, edits, deletes, and connections", () => {
    store().addNode("appServer", { x: 0, y: 0 });
    expect(store().architecture.nodes).toHaveLength(1);

    store().undo();
    expect(store().architecture.nodes).toHaveLength(0);
    expect(selectCanRedo(store())).toBe(true);

    store().redo();
    expect(store().architecture.nodes).toHaveLength(1);

    store().loadArchitecture(sampleArchitecture());
    store().updateNodeLabel(APP_ID, "Server");
    expect(appNode()?.label).toBe("Server");
    store().undo();
    expect(appNode()?.label).toBe("App");
    store().redo();
    expect(appNode()?.label).toBe("Server");

    store().loadArchitecture(sampleArchitecture());
    store().removeNode(APP_ID);
    expect(store().architecture.nodes).toHaveLength(1);
    store().undo();
    expect(store().architecture.nodes).toHaveLength(2);
    expect(store().architecture.edges).toHaveLength(1);

    const withoutEdges: Architecture = {
      ...sampleArchitecture(),
      edges: [],
    };
    store().loadArchitecture(withoutEdges);
    store().addEdge(CLIENT_ID, APP_ID);
    expect(store().architecture.edges).toHaveLength(1);
    store().undo();
    expect(store().architecture.edges).toHaveLength(0);
    store().redo();
    expect(store().architecture.edges).toHaveLength(1);
  });

  it("treats a drag as one undoable change", () => {
    store().loadArchitecture(sampleArchitecture());
    const snapshot = store().architecture;

    store().moveNode(APP_ID, { x: 240, y: 120 });
    store().moveNode(APP_ID, { x: 260, y: 140 });
    store().commitHistory(snapshot);

    expect(appNode()?.position).toEqual({ x: 260, y: 140 });
    store().undo();
    expect(appNode()?.position).toEqual({ x: 100, y: 0 });
  });

  it("rejects invalid component parameters", () => {
    store().loadArchitecture(sampleArchitecture());
    const params = defaultComponentParams("appServer");

    if (params.kind !== "appServer") {
      throw new Error("Expected app server parameters");
    }

    expect(store().updateNodeParams(APP_ID, { ...params, instances: 0 })).toBe(false);
    expect(store().updateNodeParams(APP_ID, { ...params, instances: 4 })).toBe(true);
  });

  it("reports the monthly cost of the current design", () => {
    store().loadArchitecture(sampleArchitecture());

    expect(selectCostUsd(store())).toBe(80);
  });
});
