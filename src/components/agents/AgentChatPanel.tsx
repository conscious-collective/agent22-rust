import { useEffect, useRef, useState } from "react";
import { Send, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAgentWebSocket } from "@/hooks/use-agent-ws";
import { ThinkingIndicator } from "./ThinkingIndicator";
import type { Agent } from "@/types/agent";

interface Props {
  agent: Agent;
  onClose?: () => void;
}

export function AgentChatPanel({ agent, onClose }: Props) {
  const { messages, isThinking, isConnected, sendMessage, clearMessages } =
    useAgentWebSocket(agent.id);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isThinking) return;
    setInput("");
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {agent.name[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium leading-none">{agent.name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {isConnected ? "Connected" : "Connecting…"}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={clearMessages} title="Clear chat">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          {onClose && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Send a message to start chatting with {agent.name}
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : msg.role === "tool"
                  ? "bg-amber-50 border border-amber-200 text-amber-800 font-mono text-xs"
                  : "bg-muted"
              )}
            >
              {msg.content}
              {msg.isStreaming && (
                <span className="ml-1 inline-block h-3 w-0.5 bg-current animate-pulse" />
              )}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg">
              <ThinkingIndicator />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3 shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message agent22…"
            rows={1}
            className="resize-none min-h-[36px] max-h-32"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isThinking}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
