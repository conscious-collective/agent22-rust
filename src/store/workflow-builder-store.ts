import { create } from "zustand";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type XYPosition,
} from "@xyflow/react";
import { generateId } from "@/lib/utils";
import type { StepType } from "@/types/workflow";

interface WorkflowBuilderStore {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  isDirty: boolean;

  // React Flow callbacks
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  // Actions
  addNode: (type: StepType, position: XYPosition) => void;
  selectNode: (id: string | null) => void;
  updateNodeData: (id: string, data: Record<string, unknown>) => void;
  deleteNode: (id: string) => void;
  loadFromSteps: (steps: import("@/types/workflow").WorkflowStep[]) => void;
  resetCanvas: () => void;
  markSaved: () => void;
}

const DEFAULT_NODE_LABELS: Record<StepType, string> = {
  trigger: "Trigger",
  agent: "Agent",
  condition: "Condition",
  output: "Output",
};

export const useWorkflowBuilderStore = create<WorkflowBuilderStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  isDirty: false,

  onNodesChange: (changes) =>
    set((s) => ({
      nodes: applyNodeChanges(changes, s.nodes),
      isDirty: true,
    })),

  onEdgesChange: (changes) =>
    set((s) => ({
      edges: applyEdgeChanges(changes, s.edges),
      isDirty: true,
    })),

  onConnect: (connection) =>
    set((s) => ({
      edges: addEdge({ ...connection, animated: true }, s.edges),
      isDirty: true,
    })),

  addNode: (type, position) => {
    const id = generateId();
    const newNode: Node = {
      id,
      type,
      position,
      data: { label: DEFAULT_NODE_LABELS[type] },
    };
    set((s) => ({ nodes: [...s.nodes, newNode], isDirty: true }));
    get().selectNode(id);
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  updateNodeData: (id, data) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
      isDirty: true,
    })),

  deleteNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
      isDirty: true,
    })),

  loadFromSteps: (steps) => {
    const nodes: Node[] = steps.map((step, i) => ({
      id: step.id,
      type: step.type,
      position: { x: 100 + i * 220, y: 200 },
      data: {
        label: step.name,
        agentId: step.agent_id,
        prompt: step.prompt,
        condition: step.condition,
        ...step.config,
      },
    }));

    // Auto-connect sequential steps
    const edges: Edge[] = steps.slice(0, -1).map((step, i) => ({
      id: `e-${step.id}-${steps[i + 1].id}`,
      source: step.id,
      target: steps[i + 1].id,
      animated: true,
    }));

    set({ nodes, edges, isDirty: false, selectedNodeId: null });
  },

  resetCanvas: () =>
    set({ nodes: [], edges: [], isDirty: false, selectedNodeId: null }),

  markSaved: () => set({ isDirty: false }),
}));
