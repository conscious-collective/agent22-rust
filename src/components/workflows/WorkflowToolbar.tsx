import { useState } from "react";
import { Plus, Save, Play, Bot, Flag, GitBranch, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorkflowBuilderStore } from "@/store/workflow-builder-store";
import { cn } from "@/lib/utils";
import type { StepType } from "@/types/workflow";

interface Props {
  onSave: () => void;
  onRun: () => void;
  isSaving: boolean;
  isRunning: boolean;
}

const ADD_NODES: { type: StepType; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { type: "trigger", label: "Trigger", icon: Zap, color: "text-emerald-600" },
  { type: "agent", label: "Agent Step", icon: Bot, color: "text-blue-600" },
  { type: "condition", label: "Condition", icon: GitBranch, color: "text-amber-600" },
  { type: "output", label: "Output", icon: Flag, color: "text-purple-600" },
];

export function WorkflowToolbar({ onSave, onRun, isSaving, isRunning }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const { addNode, isDirty } = useWorkflowBuilderStore();

  const handleAdd = (type: StepType) => {
    addNode(type, { x: 200 + Math.random() * 200, y: 150 + Math.random() * 150 });
    setShowAdd(false);
  };

  return (
    <div className="relative flex items-center gap-2 border-b px-4 py-2 bg-card shrink-0">
      {/* Add node dropdown */}
      <div className="relative">
        <Button size="sm" variant="outline" onClick={() => setShowAdd((v) => !v)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Step
        </Button>
        {showAdd && (
          <div className="absolute top-full left-0 mt-1 z-10 w-44 rounded-md border bg-card shadow-lg py-1">
            {ADD_NODES.map(({ type, label, icon: Icon, color }) => (
              <button
                key={type}
                onClick={() => handleAdd(type)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <Icon className={cn("h-3.5 w-3.5", color)} />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1" />

      <Button
        size="sm"
        variant="outline"
        onClick={onSave}
        disabled={isSaving || !isDirty}
      >
        <Save className="h-3.5 w-3.5 mr-1" />
        {isSaving ? "Saving…" : "Save"}
      </Button>

      <Button size="sm" onClick={onRun} disabled={isRunning}>
        <Play className="h-3.5 w-3.5 mr-1" />
        {isRunning ? "Running…" : "Run"}
      </Button>
    </div>
  );
}
