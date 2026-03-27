import { useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkflowBuilder } from "@/components/workflows/WorkflowBuilder";
import { WorkflowToolbar } from "@/components/workflows/WorkflowToolbar";
import { StepConfigPanel } from "@/components/workflows/StepConfigPanel";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useWorkflow, useUpdateWorkflow, useRunWorkflow } from "@/hooks/use-workflows";
import { useWorkflowBuilderStore } from "@/store/workflow-builder-store";
import type { WorkflowStep } from "@/types/workflow";

export function WorkflowDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = id === "new";

  const { data: workflow, isLoading } = useWorkflow(isNew ? "" : (id ?? ""));
  const { mutate: updateWorkflow, isPending: isSaving } = useUpdateWorkflow();
  const { mutate: runWorkflow, isPending: isRunning } = useRunWorkflow();
  const { loadFromSteps, resetCanvas, nodes, markSaved, isDirty } = useWorkflowBuilderStore();

  // Load workflow steps into canvas on mount
  useEffect(() => {
    if (isNew) {
      const template = (location.state as { template?: { steps: string[] } } | null)?.template;
      if (template) {
        // Pre-populate from template
        const templateSteps: WorkflowStep[] = template.steps.map((s, i) => ({
          id: `step-${i}`,
          name: s,
          type: (s.toLowerCase() === "trigger" ? "trigger"
            : s.toLowerCase() === "agent" ? "agent"
            : s.toLowerCase() === "condition" ? "condition"
            : "output") as WorkflowStep["type"],
        }));
        loadFromSteps(templateSteps);
      } else {
        resetCanvas();
      }
    } else if (workflow) {
      loadFromSteps(workflow.steps);
    }
  }, [workflow, isNew]);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    if (!workflow || isNew) return;
    // Serialize canvas back to workflow steps
    const steps: WorkflowStep[] = nodes.map((n) => ({
      id: n.id,
      name: String(n.data.label ?? n.type),
      type: n.type as WorkflowStep["type"],
      agent_id: n.data.agentId as string | undefined,
      prompt: n.data.prompt as string | undefined,
      condition: n.data.condition as string | undefined,
    }));
    updateWorkflow(
      { id: workflow.id, payload: { name: workflow.name, description: workflow.description, steps } },
      { onSuccess: () => markSaved() }
    );
  };

  const handleRun = () => {
    if (!workflow || isNew) return;
    runWorkflow({ id: workflow.id });
  };

  if (!isNew && isLoading) return <LoadingSpinner />;

  const title = isNew ? "New Workflow" : (workflow?.name ?? "Workflow");

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate("/workflows")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-sm font-semibold">{title}</h1>
        {isDirty && <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Unsaved</span>}
      </header>

      <WorkflowToolbar
        onSave={handleSave}
        onRun={handleRun}
        isSaving={isSaving}
        isRunning={isRunning}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <WorkflowBuilder />
        </div>
        <StepConfigPanel />
      </div>
    </div>
  );
}
