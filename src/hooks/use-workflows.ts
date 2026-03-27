import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreateWorkflowPayload } from "@/types/workflow";

export const workflowKeys = {
  all: ["workflows"] as const,
  detail: (id: string) => ["workflows", id] as const,
  runs: (id: string) => ["workflows", id, "runs"] as const,
};

export function useWorkflows() {
  return useQuery({
    queryKey: workflowKeys.all,
    queryFn: () => api.workflows.list(),
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: workflowKeys.detail(id),
    queryFn: () => api.workflows.get(id),
    enabled: !!id,
  });
}

export function useWorkflowRuns(workflowId: string) {
  return useQuery({
    queryKey: workflowKeys.runs(workflowId),
    queryFn: () => api.workflows.listRuns(workflowId),
    enabled: !!workflowId,
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateWorkflowPayload) => api.workflows.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}

export function useUpdateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateWorkflowPayload }) =>
      api.workflows.update(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: workflowKeys.all });
      qc.invalidateQueries({ queryKey: workflowKeys.detail(id) });
    },
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.workflows.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.all }),
  });
}

export function useRunWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: unknown }) =>
      api.workflows.run(id, input),
    onSuccess: (_, { id }) =>
      qc.invalidateQueries({ queryKey: workflowKeys.runs(id) }),
  });
}
