/**
 * Typed API layer — ALL invoke() calls live here.
 * Components and hooks import from this file, never raw invoke().
 */
import { invoke } from "@tauri-apps/api/core";
import type { Agent, CreateAgentPayload, UpdateAgentPayload, MessageResponse } from "@/types/agent";
import type { Workflow, CreateWorkflowPayload, WorkflowRun } from "@/types/workflow";
import type { Skill } from "@/types/skill";
import type { Provider, Model } from "@/types/provider";
import type { DaemonStatusResponse } from "@/types/common";

export const api = {
  daemon: {
    getStatus: () => invoke<DaemonStatusResponse>("get_daemon_status"),
    start: () => invoke<void>("start_daemon"),
    stop: () => invoke<void>("stop_daemon"),
  },

  agents: {
    list: () => invoke<Agent[]>("list_agents"),
    get: (id: string) => invoke<Agent>("get_agent", { id }),
    create: (payload: CreateAgentPayload) => invoke<Agent>("create_agent", { payload }),
    update: (id: string, payload: UpdateAgentPayload) =>
      invoke<Agent>("update_agent", { id, payload }),
    delete: (id: string) => invoke<void>("delete_agent", { id }),
    sendMessage: (id: string, message: string, conversationId?: string) =>
      invoke<MessageResponse>("send_message", { id, message, conversationId }),
    resetSession: (id: string) => invoke<void>("reset_session", { id }),
  },

  workflows: {
    list: () => invoke<Workflow[]>("list_workflows"),
    get: (id: string) => invoke<Workflow>("get_workflow", { id }),
    create: (payload: CreateWorkflowPayload) => invoke<Workflow>("create_workflow", { payload }),
    update: (id: string, payload: CreateWorkflowPayload) =>
      invoke<Workflow>("update_workflow", { id, payload }),
    delete: (id: string) => invoke<void>("delete_workflow", { id }),
    run: (id: string, input?: unknown) => invoke<WorkflowRun>("run_workflow", { id, input }),
    listRuns: (workflowId: string) =>
      invoke<WorkflowRun[]>("list_workflow_runs", { workflowId }),
  },

  skills: {
    list: () => invoke<Skill[]>("list_skills"),
    searchMarketplace: (query: string) => invoke<Skill[]>("search_marketplace", { query }),
  },

  providers: {
    list: () => invoke<Provider[]>("list_providers"),
    listModels: () => invoke<Model[]>("list_models"),
    setKey: (provider: string, key: string) =>
      invoke<void>("set_provider_key", { provider, key }),
    test: (provider: string) => invoke<boolean>("test_provider", { provider }),
  },
} as const;
