export interface Agent {
  id: string;
  name: string;
  description?: string;
  model?: string;
  state?: string;
  tags: string[];
  created_at?: string;
}

export interface CreateAgentPayload {
  name: string;
  description?: string;
  model?: string;
  system_prompt?: string;
  tags?: string[];
  tools?: string[];
}

export interface UpdateAgentPayload {
  description?: string;
  system_prompt?: string;
  tags?: string[];
}

export interface MessageResponse {
  content: string;
  usage?: unknown;
  conversation_id?: string;
}

export type ChatRole = "user" | "assistant" | "tool";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  tool_name?: string;
  timestamp: number;
  isStreaming?: boolean;
}
