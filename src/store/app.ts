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
    id: "sustainability-ethics",
    name: "Sustainability & Ethical AI",
    description:
      "Explore sustainable technology practices, ethical AI principles, carbon-aware computing, responsible data use, and how to build systems that are fair, transparent, and planet-conscious.",
    welcomeMessage:
      "Hi! I'm your Sustainability & Ethical AI advisor.\n\nI can help you think through ethical AI design, measure and reduce your tech's environmental footprint, navigate bias and fairness, or explore responsible data practices. What's on your mind?",
    placeholder: "Ask about ethical AI, sustainability, carbon footprint, bias, fairness…",
  },
  {
    id: "content-creator",
    name: "Content Creator",
    description:
      "Create compelling blog posts, social media content, newsletters, and more with an AI that understands tone, audience, and format.",
    welcomeMessage:
      "Hi! I'm your content creation assistant.\n\nWhat would you like to create today? I can help with blog posts, social media, newsletters, scripts, and more.",
    placeholder: "Describe the content you want to create…",
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
