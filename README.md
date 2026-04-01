# agent22

A desktop app for chatting with specialised AI agents — entirely offline. Built with [Tauri](https://tauri.app) and [llama.cpp](https://github.com/ggerganov/llama.cpp).

![tauri](https://img.shields.io/badge/tauri-2.0-blue) ![rust](https://img.shields.io/badge/rust-1.77+-orange) ![license](https://img.shields.io/badge/license-MIT-green)

## Agents

| Agent | Role |
|-------|------|
| **Sustainability Buddy** | ESG strategy, carbon accounting, sustainability reporting, green tech, and responsible business practices |

More agents coming. Adding one is [a few lines of code](#adding-an-agent).

## How it works

- Pick an agent from the list
- On first use the model downloads automatically (~1 GB, one time)
- Chat with real-time streaming responses
- Everything runs locally — no cloud, no API keys, no content filtering

## Setup

**Requirements:** Rust stable, Node 22+

```bash
git clone https://github.com/conscious-collective/agent22-rust
cd agent22-rust
npm install
npm run dev
```

On first agent launch the app downloads **Qwen2.5-1.5B-Instruct Q4_K_M** (~1 GB) from HuggingFace and loads it directly. No external runtime required.

## Model

| Model | Size | RAM | Source |
|-------|------|-----|--------|
| Qwen2.5-1.5B-Instruct Q4_K_M | ~1 GB | ~1.5 GB | `bartowski/Qwen2.5-1.5B-Instruct-GGUF` |

To swap the model, edit the three constants at the top of `src-tauri/src/model.rs`:

```rust
const HF_REPO: &str = "bartowski/Qwen2.5-1.5B-Instruct-GGUF";
const HF_FILE: &str = "Qwen2.5-1.5B-Instruct-Q4_K_M.gguf";
const MODEL_FILENAME: &str = "Qwen2.5-1.5B-Instruct-Q4_K_M.gguf";
```

Any public HuggingFace GGUF repo works.

## Build

```bash
npm run build
# installer → src-tauri/target/release/bundle/
```

## Adding an agent

1. Add an entry to `AGENTS` in `src/store/app.ts`:

```ts
{
  id: "my-agent",
  name: "My Agent",
  description: "What this agent does.",
  welcomeMessage: "Hi! I'm your ...",
  placeholder: "Ask me anything about ...",
}
```

2. Add the matching system prompt in `src-tauri/src/commands/chat.rs`:

```rust
"my-agent" => "You are a ...",
```

That's it.

## Stack

- [Tauri 2.0](https://tauri.app) — Rust desktop shell
- [llama-cpp-2](https://crates.io/crates/llama-cpp-2) — GGUF inference (Rust bindings to llama.cpp)
- [React 18](https://react.dev) + TypeScript
- [TailwindCSS 3](https://tailwindcss.com)
- [Zustand](https://zustand-demo.pmnd.rs) — client state

## License

MIT — see [LICENSE](LICENSE).
