# Architecture

## Overview

agent22 is a Tauri desktop app. The frontend is React + TypeScript. The backend is Rust.
AI inference runs entirely in-process via `llama-cpp-2` (Rust bindings to llama.cpp) — no
external runtime, no cloud API, no content filtering.

```
┌─────────────────────────────────────────────────────────┐
│                     agent22 (Tauri)                     │
│                                                         │
│  ┌───────────────────┐  invoke()   ┌─────────────────┐  │
│  │  React Frontend   │ ──────────► │  Rust Backend   │  │
│  │                   │ ◄────────── │                 │  │
│  │  Onboarding       │  events     │  model.rs       │  │
│  │  AgentList        │             │  commands/      │  │
│  │  Chat             │             │    chat.rs      │  │
│  └───────────────────┘             └────────┬────────┘  │
│                                             │            │
│                               llama-cpp-2 (in-process)  │
│                               Qwen2.5-1.5B-Instruct     │
│                               Q4_K_M GGUF               │
└─────────────────────────────────────────────────────────┘
```

## User flow

```
App launch
    │
    ├─ Model on disk? → load in background → skip to AgentList
    └─ First run      → Onboarding (welcome) → AgentList
                                                    │
                             User picks agent ──────┘
                                                    │
                             Model not ready?       │
                             download + load ───────┤
                                                    │
                                               Chat view
                                    (model://token events, streaming)
```

## Directory structure

```
agent22-rust/
├── src/                           # React + TypeScript frontend
│   ├── App.tsx                    # Router: Onboarding → AgentList → Chat
│   ├── pages/
│   │   ├── Onboarding.tsx         # Welcome screen (first run only)
│   │   ├── AgentList.tsx          # Agent picker — triggers model setup on click
│   │   └── Chat.tsx               # Streaming chat, sidebar, back button
│   ├── components/
│   │   ├── ChatMessage.tsx        # Message bubble
│   │   └── ModelStatus.tsx        # Progress bar + status listener
│   └── store/
│       └── app.ts                 # Zustand — model status, selected agent, messages
│
└── src-tauri/                     # Rust backend
    └── src/
        ├── lib.rs                 # Tauri builder, background model load on startup
        ├── model.rs               # Download, load, and stream GGUF inference
        ├── state.rs               # AppState: reqwest client + ModelState
        ├── error.rs               # AppError enum
        └── commands/
            ├── mod.rs
            ├── onboarding.rs      # get_model_status, start_model_setup
            └── chat.rs            # send_message → spawn_blocking → generate_stream
```

## Model

The GGUF file is downloaded once to the OS app-data directory:

| Platform | Path |
|----------|------|
| macOS    | `~/Library/Application Support/com.agent22.app/<filename>.gguf` |
| Windows  | `%APPDATA%\com.agent22.app\<filename>.gguf` |
| Linux    | `~/.config/com.agent22.app/<filename>.gguf` |

**To change the model**, update three constants at the top of `src-tauri/src/model.rs`:

```rust
const HF_REPO: &str = "bartowski/Qwen2.5-1.5B-Instruct-GGUF";
const HF_FILE: &str = "Qwen2.5-1.5B-Instruct-Q4_K_M.gguf";
const MODEL_FILENAME: &str = "Qwen2.5-1.5B-Instruct-Q4_K_M.gguf";
```

Any public HuggingFace GGUF repo works. Recommended quantisation: `Q4_K_M` (best
quality/size tradeoff). Delete the old `.gguf` from the app-data dir after changing.

## Inference pipeline

`send_message` (Tauri command) builds a ChatML prompt from the conversation history
plus the agent's system prompt, then calls `model::generate_stream` inside
`spawn_blocking` (llama-cpp-2 is synchronous). Each generated token is emitted as a
`model://token` event; `model://done` signals completion.

```
Frontend                  Rust command            llama-cpp-2
   │                           │                      │
   │── invoke send_message ───►│                      │
   │                           │── spawn_blocking ───►│
   │                           │                      │ token 1
   │◄── emit model://token ────│◄─────────────────────│
   │                           │                      │ token 2
   │◄── emit model://token ────│◄─────────────────────│
   │                           │                      │ [EOG]
   │◄── emit model://done  ────│◄─────────────────────│
```

## Adding an agent

**1. Frontend** — `src/store/app.ts`, `AGENTS` array:
```ts
{
  id: "my-agent",
  name: "My Agent",
  description: "What this agent does.",
  welcomeMessage: "Hi! I'm your ...",
  placeholder: "Ask me anything about ...",
}
```

**2. Backend** — `src-tauri/src/commands/chat.rs`, `system_prompt()`:
```rust
"my-agent" => "You are a ...",
```

## State

**Frontend** (Zustand, `src/store/app.ts`):

| Field | Type | Purpose |
|-------|------|---------|
| `onboarded` | bool | Has user passed the welcome screen |
| `selectedAgent` | `Agent \| null` | Active agent (null → show AgentList) |
| `modelStatus` | `ModelStatus` | Download/load lifecycle |
| `modelProgress` | number | Download progress 0–100 |
| `messages` | `ChatMessage[]` | Current conversation |
| `isGenerating` | bool | Token stream in progress |

**Backend** (`AppState` in `src-tauri/src/state.rs`):

| Field | Purpose |
|-------|---------|
| `client` | `reqwest::Client` — HuggingFace downloads |
| `model` | `ModelState` — status, progress, error; updated by `model.rs` |
