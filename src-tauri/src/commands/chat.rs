use serde_json::Value;
use tauri::{AppHandle, State};

use crate::error::AppError;
use crate::model;
use crate::state::AppState;

/// Send a chat message. Streams response tokens via `model://token` events.
/// Finishes with a `model://done` event.
///
/// `messages`         — full conversation history `[{ role, content }]`
/// `analysis_context` — optional JSON summary of current analysis, injected as system context
#[tauri::command]
pub async fn send_message(
    app: AppHandle,
    _state: State<'_, AppState>,
    messages: Vec<Value>,
    analysis_context: Option<String>,
) -> Result<(), AppError> {
    let mut full_messages: Vec<Value> = Vec::new();

    // System prompt — always first
    let system_content = build_system_prompt(analysis_context.as_deref());
    full_messages.push(Value::Object({
        let mut m = serde_json::Map::new();
        m.insert("role".into(), "system".into());
        m.insert("content".into(), Value::String(system_content));
        m
    }));
    full_messages.extend(messages);

    // Run streaming inference in blocking thread (llama_cpp_2 is sync)
    tokio::task::spawn_blocking(move || model::generate_stream(full_messages, app))
        .await
        .map_err(|e| AppError::Model(format!("spawn: {e}")))?
        .map_err(|e| AppError::Model(format!("stream: {e}")))?;

    Ok(())
}

fn build_system_prompt(analysis_context: Option<&str>) -> String {
    let base = "You are an ICP advisor for a GTM sales team. \
                You help revenue teams understand which accounts to prioritize and why. \
                Be concise, direct, and use specific examples from the analysis when relevant. \
                Never mention technical implementation details or Shapley values by name — \
                refer to 'contributing factors' or 'key signals' instead.";

    match analysis_context {
        Some(ctx) => format!("{base}\n\nCurrent pipeline analysis context:\n{ctx}"),
        None      => base.to_string(),
    }
}
