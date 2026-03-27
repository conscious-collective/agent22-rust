import { create } from "zustand";

interface UIStore {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  activeChatAgentId: string | null;
  openAgentChat: (id: string) => void;
  closeAgentChat: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  activeChatAgentId: null,
  openAgentChat: (id) => set({ activeChatAgentId: id }),
  closeAgentChat: () => set({ activeChatAgentId: null }),
}));
