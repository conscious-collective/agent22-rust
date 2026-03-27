export type StepType = "trigger" | "agent" | "condition" | "output";

export interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  agent_id?: string;
  prompt?: string;
  condition?: string;
  config?: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  tags: string[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateWorkflowPayload {
  name: string;
  description?: string;
  steps: WorkflowStep[];
  tags?: string[];
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  status: "pending" | "running" | "completed" | "failed";
  output?: unknown;
  error?: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
}

// React Flow node data shapes
export interface TriggerNodeData { label: string; schedule?: string }
export interface AgentNodeData   { label: string; agentId?: string; prompt?: string }
export interface ConditionNodeData { label: string; condition?: string }
export interface OutputNodeData  { label: string; format?: string }
