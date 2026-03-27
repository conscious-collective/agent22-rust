import { useCallback, useEffect, useRef, useState } from "react";
import { generateId } from "@/lib/utils";
import type { ChatMessage } from "@/types/agent";

const WS_BASE = "ws://127.0.0.1:4200";

interface WsEvent {
  type: "thinking" | "text_delta" | "tool_start" | "tool_result" | "response" | "error";
  content?: string;
  tool?: string;
  message?: string;
}

export function useAgentWebSocket(agentId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const streamingIdRef = useRef<string | null>(null);
  const conversationIdRef = useRef<string>(generateId());

  const appendOrUpdateMessage = useCallback(
    (id: string, patch: Partial<ChatMessage>) => {
      setMessages((prev) => {
        const idx = prev.findIndex((m) => m.id === id);
        if (idx === -1) {
          return [...prev, { id, role: "assistant", content: "", timestamp: Date.now(), ...patch }];
        }
        return prev.map((m, i) => (i === idx ? { ...m, ...patch } : m));
      });
    },
    []
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_BASE}/api/agents/${agentId}/ws`);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => {
      setIsConnected(false);
      setIsThinking(false);
    };

    ws.onmessage = (event) => {
      let data: WsEvent;
      try {
        data = JSON.parse(event.data as string) as WsEvent;
      } catch {
        return;
      }

      switch (data.type) {
        case "thinking": {
          setIsThinking(true);
          const sid = generateId();
          streamingIdRef.current = sid;
          appendOrUpdateMessage(sid, { role: "assistant", content: "", isStreaming: true });
          break;
        }
        case "text_delta": {
          const sid = streamingIdRef.current;
          if (sid && data.content) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === sid ? { ...m, content: m.content + data.content! } : m
              )
            );
          }
          break;
        }
        case "tool_start": {
          const tid = generateId();
          appendOrUpdateMessage(tid, {
            role: "tool",
            content: `Running: ${data.tool ?? "tool"}`,
            tool_name: data.tool,
          });
          break;
        }
        case "response": {
          setIsThinking(false);
          const sid = streamingIdRef.current;
          if (sid) {
            setMessages((prev) =>
              prev.map((m) => (m.id === sid ? { ...m, isStreaming: false } : m))
            );
            streamingIdRef.current = null;
          }
          break;
        }
        case "error": {
          setIsThinking(false);
          const eid = generateId();
          appendOrUpdateMessage(eid, {
            role: "assistant",
            content: `Error: ${data.message ?? "unknown error"}`,
          });
          break;
        }
      }
    };
  }, [agentId, appendOrUpdateMessage]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        connect();
        return;
      }
      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      wsRef.current.send(
        JSON.stringify({
          message: text,
          conversation_id: conversationIdRef.current,
        })
      );
    },
    [connect]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    conversationIdRef.current = generateId();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return { messages, isThinking, isConnected, sendMessage, clearMessages };
}
