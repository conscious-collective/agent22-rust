import { useState } from "react";
import { Plus, GitFork, Play, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogClose, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useWorkflows, useCreateWorkflow, useDeleteWorkflow, useRunWorkflow } from "@/hooks/use-workflows";
import { formatRelativeTime } from "@/lib/utils";

export function Workflows() {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const navigate = useNavigate();

  const { data: workflows = [], isLoading } = useWorkflows();
  const { mutate: createWorkflow, isPending: isCreating } = useCreateWorkflow();
  const { mutate: deleteWorkflow } = useDeleteWorkflow();
  const { mutate: runWorkflow, isPending: isRunning } = useRunWorkflow();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createWorkflow(
      { name: name.trim(), description: description.trim() || undefined, steps: [] },
      {
        onSuccess: (wf) => {
          setName(""); setDescription(""); setCreateOpen(false);
          navigate(`/workflows/${wf.id}`);
        },
      }
    );
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
        <h1 className="text-sm font-semibold">Workflows</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Workflow
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <LoadingSpinner />
        ) : workflows.length === 0 ? (
          <EmptyState
            icon={GitFork}
            title="No workflows yet"
            description="Create a workflow to automate multi-step tasks with AI agents."
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Workflow
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                className="flex items-center gap-4 rounded-lg border bg-card px-4 py-3 hover:shadow-sm transition-shadow"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 shrink-0">
                  <GitFork className="h-4 w-4 text-purple-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{wf.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {wf.steps.length} step{wf.steps.length !== 1 ? "s" : ""} · updated {formatRelativeTime(wf.updated_at)}
                  </p>
                </div>

                {wf.tags.length > 0 && (
                  <div className="hidden md:flex gap-1">
                    {wf.tags.slice(0, 2).map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-1 shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => runWorkflow({ id: wf.id })}
                    disabled={isRunning}
                    title="Run"
                  >
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => navigate(`/workflows/${wf.id}`)}
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => deleteWorkflow(wf.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
        <DialogClose onClose={() => setCreateOpen(false)} />
        <DialogHeader>
          <DialogTitle>New Workflow</DialogTitle>
          <p className="text-sm text-muted-foreground">Give your workflow a name to get started.</p>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs font-medium mb-1 block">Name *</label>
            <Input
              placeholder="e.g. Content Pipeline"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Description</label>
            <Textarea
              placeholder="What does this workflow do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isCreating || !name.trim()}>
              {isCreating ? "Creating…" : "Create & Open Builder"}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
