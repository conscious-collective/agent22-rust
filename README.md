# agent22

Local AI workflow automation desktop app — build, run, and chat with AI agents entirely offline. Built with [Tauri](https://tauri.app) and powered by [OpenFang](https://openfang.sh).

![tauri](https://img.shields.io/badge/tauri-2.0-blue) ![rust](https://img.shields.io/badge/rust-1.87+-orange) ![license](https://img.shields.io/badge/license-MIT-green)

## Features

- **Agents** — create named AI teammates with custom roles, system prompts, and models
- **Workflows** — visually chain agents into multi-step automations on a drag-and-drop canvas
- **Skills** — browse and use 60+ bundled capabilities
- **Live chat** — stream responses from any agent in real time via WebSocket
- **Providers** — connect Ollama, Anthropic, OpenAI, Groq, and 22 more

No cloud. No subscriptions. Nothing leaves your machine. The AI engine runs bundled inside the app.

## Setup

**Requirements:** Rust stable, Node 22+

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Optional but recommended — local LLM, no API key needed
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen2.5:7b
```

## Run

```bash
git clone https://github.com/conscious-collective/agent22-rust
cd agent22-rust
npm install
npm run dev
```

First run downloads the correct engine binary for your platform automatically. The engine starts in the background when the app launches. Configure an LLM provider in Settings if you haven't set up Ollama.

## Build a distributable

```bash
npm run build
# .dmg / .exe / .AppImage → src-tauri/target/release/bundle/
```

Produces a self-contained installer — the engine binary is bundled in, end users install one file.

## Local model recommendation

**`qwen2.5:7b`** — best balance of quality and resource use for an 8 GB machine.

| Model | Download | RAM usage | Notes |
|-------|----------|-----------|-------|
| `qwen2.5:7b` | 4.7 GB | ~4 GB | Recommended — strong reasoning, Apache 2.0 |
| `qwen2.5:3b` | 1.9 GB | ~2 GB | Lighter option for constrained systems |

```bash
ollama pull qwen2.5:7b
ollama serve
```

OpenFang auto-discovers all Ollama models. No config needed.

## Architecture

```
agent22-rust/
├── scripts/
│   └── download-sidecar.sh   # fetches engine binary for current platform
├── src/                      # React + TypeScript frontend
│   ├── pages/                # Dashboard, Agents, Workflows, Skills, Settings
│   ├── components/           # UI, layout, agent chat, workflow builder nodes
│   ├── hooks/                # TanStack Query + WebSocket hooks
│   ├── store/                # Zustand — daemon status, UI, workflow canvas
│   ├── lib/api.ts            # All Tauri invoke() calls — single boundary
│   └── types/                # Shared TypeScript types
└── src-tauri/                # Rust backend
    ├── binaries/             # Downloaded engine binary (gitignored)
    └── src/
        ├── sidecar.rs        # Engine lifecycle — start, stop, health monitor
        ├── commands/         # 24 Tauri commands (agents, workflows, skills, providers)
        ├── state.rs          # Shared app state (reqwest client, daemon status)
        └── error.rs          # Typed error enum
```

**Data flow:**
- UI → `invoke()` → Tauri command → `reqwest` → engine REST API (`localhost:4200`)
- Agent chat → WebSocket direct from webview → `ws://localhost:4200/api/agents/{id}/ws`

## LLM providers

| Provider | Setup |
|----------|-------|
| Ollama | `ollama serve` + `ollama pull <model>` — zero config, auto-discovered |
| Anthropic | `ANTHROPIC_API_KEY` or Settings → Providers |
| OpenAI | `OPENAI_API_KEY` or Settings → Providers |
| Groq | `GROQ_API_KEY` or Settings → Providers |
| + 22 more | Settings → Providers |

## Stack

- [Tauri 2.0](https://tauri.app) — Rust desktop shell
- [OpenFang](https://openfang.sh) — agent runtime, 76 REST/WS/SSE endpoints
- [React 18](https://react.dev) + TypeScript
- [TailwindCSS 3](https://tailwindcss.com)
- [@xyflow/react](https://reactflow.dev) — workflow canvas
- [TanStack Query](https://tanstack.com/query) — server state
- [Zustand](https://zustand-demo.pmnd.rs) — client state
