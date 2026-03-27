import { useState } from "react";
import { Dialog, DialogClose, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useCreateAgent } from "@/hooks/use-agents";
import { useModels } from "@/hooks/use-providers";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateAgentDialog({ open, onClose }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [model, setModel] = useState("");

  const { data: models = [] } = useModels();
  const { mutate: createAgent, isPending } = useCreateAgent();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createAgent(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        system_prompt: systemPrompt.trim() || undefined,
        model: model || undefined,
      },
      {
        onSuccess: () => {
          setName(""); setDescription(""); setSystemPrompt(""); setModel("");
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogClose onClose={onClose} />
      <DialogHeader>
        <DialogTitle>Create Agent</DialogTitle>
        <p className="text-sm text-muted-foreground">
          Configure a new AI teammate powered by OpenFang.
        </p>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-medium mb-1 block">Name *</label>
          <Input
            placeholder="e.g. Research Assistant"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-xs font-medium mb-1 block">Description</label>
          <Input
            placeholder="What does this agent do?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs font-medium mb-1 block">Model</label>
          <Select value={model} onChange={(e) => setModel(e.target.value)}>
            <option value="">Default</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.provider})
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="text-xs font-medium mb-1 block">System Prompt</label>
          <Textarea
            placeholder="You are a helpful assistant that..."
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isPending || !name.trim()}>
            {isPending ? "Creating…" : "Create Agent"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
