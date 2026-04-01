import { create } from "zustand";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export type ModelStatus =
  | "not_downloaded"
  | "downloading"
  | "loading"
  | "ready"
  | "error";

export interface Agent {
  id: string;
  name: string;
  description: string;
  welcomeMessage: string;
  placeholder: string;
}

export const AGENTS: Agent[] = [
  {
    id: "sustainability-consultant",
    name: "Sustainability Buddy",
    description:
      "Your expert guide for sustainability strategy, ESG frameworks, carbon footprint analysis, green technology adoption, and building environmentally responsible organizations.",
    welcomeMessage:
      "Hi, I'm Sustainability Buddy!\n\nI can help with ESG strategy, carbon accounting, sustainability reporting, green tech adoption, or advising on responsible business practices. What are you working on?",
    placeholder: "Ask about ESG, carbon footprint, sustainability strategy, green tech…",
  },
];

interface AppStore {
  // Setup
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;

  // Agent selection
  selectedAgent: Agent | null;
  setSelectedAgent: (agent: Agent | null) => void;

  // Model
  modelStatus: ModelStatus;
  modelProgress: number;
  modelError: string | null;
  setModelStatus: (s: ModelStatus) => void;
  setModelProgress: (p: number) => void;
  setModelError: (e: string | null) => void;

  // Chat
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  updateLastMessage: (content: string, done?: boolean) => void;
  clearMessages: () => void;
  isGenerating: boolean;
  setGenerating: (v: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  onboarded: false,
  setOnboarded: (v) => set({ onboarded: v }),

  selectedAgent: null,
  setSelectedAgent: (agent) => set({ selectedAgent: agent, messages: [] }),

  modelStatus: "not_downloaded",
  modelProgress: 0,
  modelError: null,
  setModelStatus: (s) => set({ modelStatus: s }),
  setModelProgress: (p) => set({ modelProgress: p }),
  setModelError: (e) => set({ modelError: e }),

  messages: [],
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  updateLastMessage: (content, done = false) =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === "assistant") {
        msgs[msgs.length - 1] = {
          ...last,
          content: last.content + content,
          isStreaming: !done,
        };
      }
      return { messages: msgs };
    }),
  clearMessages: () => set({ messages: [] }),
  isGenerating: false,
  setGenerating: (v) => set({ isGenerating: v }),
}));
