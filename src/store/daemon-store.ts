import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import { api } from "@/lib/api";
import type { DaemonStatus } from "@/types/common";

interface DaemonStore {
  status: DaemonStatus;
  errorMessage: string | null;
  setStatus: (status: DaemonStatus, error?: string) => void;
  startDaemon: () => Promise<void>;
  stopDaemon: () => Promise<void>;
  init: () => Promise<() => void>;
}

export const useDaemonStore = create<DaemonStore>((set) => ({
  status: "stopped",
  errorMessage: null,

  setStatus: (status, error) =>
    set({ status, errorMessage: error ?? null }),

  startDaemon: async () => {
    set({ status: "starting", errorMessage: null });
    try {
      await api.daemon.start();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ status: "error", errorMessage: msg });
    }
  },

  stopDaemon: async () => {
    try {
      await api.daemon.stop();
      set({ status: "stopped", errorMessage: null });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      set({ status: "error", errorMessage: msg });
    }
  },

  init: async () => {
    // Sync initial state from Rust
    try {
      const s = await api.daemon.getStatus();
      set({ status: s.status, errorMessage: s.error_message ?? null });
    } catch {
      // ignore
    }

    // Listen for status events from Rust
    const unlisten = await listen<{ status: DaemonStatus; error?: string }>(
      "daemon://status",
      (event) => {
        set({
          status: event.payload.status,
          errorMessage: event.payload.error ?? null,
        });
      }
    );

    return unlisten;
  },
}));
