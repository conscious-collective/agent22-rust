import { create } from "zustand";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export interface ShapleyContribution {
  feature: string;
  value: number;
}

export interface ShapleyResult {
  company: string;
  score: number;
  tier: "Tier 1" | "Tier 2" | "Nurture" | "Poor Fit";
  contributions: [string, number][];
  baseline: number;
}

export interface AnalysisSummary {
  total: number;
  tier1: number;
  tier2: number;
  nurture: number;
  poor_fit: number;
  top_tier1: string[];
  top_drivers: string[];
}

export interface IcpRubric {
  company_id_column: string;
  rationale: string;
  rules: Array<{
    feature: string;
    weight: number;
    ideal_description: string;
  }>;
}

export interface AnalysisResult {
  rubric: IcpRubric;
  records: ShapleyResult[];
  summary: AnalysisSummary;
  llm_narrative: string;
}

export type ModelStatus =
  | "not_downloaded"
  | "downloading"
  | "loading"
  | "ready"
  | "error";

interface AppStore {
  // Setup complete (welcome + model)
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;

  // Lead gate — shown before first report
  leadSubmitted: boolean;
  setLeadSubmitted: (v: boolean) => void;
  pendingAnalysis: AnalysisResult | null;
  setPendingAnalysis: (r: AnalysisResult | null) => void;

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

  // Analysis
  analysisResult: AnalysisResult | null;
  isAnalysing: boolean;
  setAnalysisResult: (r: AnalysisResult | null) => void;
  setAnalysing: (v: boolean) => void;

  // Analysis context (compressed for chat system prompt)
  analysisContext: string | null;
  setAnalysisContext: (ctx: string | null) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  onboarded: false,
  setOnboarded: (v) => set({ onboarded: v }),

  leadSubmitted: false,
  setLeadSubmitted: (v) => set({ leadSubmitted: v }),
  pendingAnalysis: null,
  setPendingAnalysis: (r) => set({ pendingAnalysis: r }),

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

  analysisResult: null,
  isAnalysing: false,
  setAnalysisResult: (r) => set({ analysisResult: r }),
  setAnalysing: (v) => set({ isAnalysing: v }),

  analysisContext: null,
  setAnalysisContext: (ctx) => set({ analysisContext: ctx }),
}));
