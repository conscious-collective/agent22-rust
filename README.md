# agent22

A local AI workflow automation desktop app — think Relay.app, but fully offline, built with [Tauri](https://tauri.app) and powered by [OpenFang](https://openfang.sh).

![agent22](https://img.shields.io/badge/tauri-2.0-blue) ![rust](https://img.shields.io/badge/rust-1.87+-orange) ![license](https://img.shields.io/badge/license-MIT-green)

## What it is

agent22 gives you a clean local UI to build, run, and chat with AI agents — no cloud, no subscriptions, no data leaving your machine.

- **Agents** — create named AI teammates with custom roles, system prompts, and models
- **Workflows** — visually chain agents together into multi-step automations using a drag-and-drop canvas
- **Skills** — browse and use 60+ bundled OpenFang capabilities
- **Live chat** — stream responses from any agent in real time via WebSocket
- **Providers** — connect any of 26 LLM providers (Anthropic, OpenAI, Ollama, Groq, etc.)

OpenFang runs as a local daemon in the background. agent22 is just the UI.

## Prerequisites

**Rust + Node**
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh  # Rust stable
node --version  # Node 22+
```

**OpenFang CLI**
```bash
cargo install --git https://github.com/RightNow-AI/openfang openfang-cli
```

**At least one LLM provider.** Easiest local option (no API key):
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen2.5:7b
```

## Running

```bash
git clone https://github.com/conscious-collective/agent22-rust
cd agent22-rust
npm install
npm run dev
```

The app auto-starts the OpenFang daemon on launch. If it fails, hit **Start** in the sidebar footer or go to Settings → Providers to configure an LLM key.

## Building a release

```bash
npm run build
# Output: src-tauri/target/release/bundle/
```

## Architecture

```
agent22-rust/
├── src/                    # React + TypeScript frontend
│   ├── pages/              # Dashboard, Agents, Workflows, Skills, Settings
│   ├── components/         # UI, layout, agent chat, workflow builder
│   ├── hooks/              # TanStack Query + WebSocket hooks
│   ├── store/              # Zustand (daemon, UI, workflow canvas)
│   ├── lib/api.ts          # All Tauri invoke() calls in one place
│   └── types/              # Shared TypeScript types
└── src-tauri/              # Rust backend
    └── src/
        ├── sidecar.rs      # OpenFang daemon lifecycle
        ├── commands/       # 24 Tauri commands (agents, workflows, skills, providers)
        ├── state.rs        # Shared app state
        └── error.rs        # Typed error enum
```

**Data flow:**
- REST calls → Tauri command → reqwest → OpenFang API (`localhost:4200`)
- Agent chat → WebSocket directly from webview → `ws://localhost:4200/api/agents/{id}/ws`

## LLM providers

| Provider | Setup |
|----------|-------|
| Ollama (local) | `ollama serve` + `ollama pull <model>` — auto-discovered, no key needed |
| Anthropic | `ANTHROPIC_API_KEY` or set via Settings |
| OpenAI | `OPENAI_API_KEY` or set via Settings |
| Groq | `GROQ_API_KEY` or set via Settings |
| + 22 more | Configured via Settings → Providers |

## Recommended local model

**`qwen2.5:7b`** via Ollama — 4.7 GB download, runs comfortably on 8 GB RAM with Q4 quantization (~4 GB active), Apache 2.0 license, strong reasoning and instruction following.

```bash
ollama pull qwen2.5:7b
```

OpenFang auto-discovers it once Ollama is running. No config needed.

For tighter memory budgets: `qwen2.5:3b` (1.9 GB, ~2 GB RAM).

## Stack

- [Tauri 2.0](https://tauri.app) — Rust desktop shell
- [OpenFang](https://openfang.sh) — agent runtime, 76 REST/WS endpoints
- [React 18](https://react.dev) + TypeScript
- [TailwindCSS 3](https://tailwindcss.com)
- [@xyflow/react](https://reactflow.dev) — workflow canvas
- [TanStack Query](https://tanstack.com/query) — server state
- [Zustand](https://zustand-demo.pmnd.rs) — client state
