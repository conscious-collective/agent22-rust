use serde_json::{json, Value};
use tauri::{AppHandle, State};

use crate::error::AppError;
use crate::model;
use crate::state::AppState;

/// Send a chat message. Streams response tokens via `model://token` events,
/// ends with `model://done`.
///
/// `messages`  — conversation history `[{ role, content }]`
/// `agent_id`  — selects the system prompt for the active agent
#[tauri::command]
pub async fn send_message(
    app: AppHandle,
    _state: State<'_, AppState>,
    messages: Vec<Value>,
    agent_id: String,
) -> Result<(), AppError> {
    let system_msg = json!({
        "role": "system",
        "content": system_prompt(&agent_id),
    });

    let mut full_messages = vec![system_msg];
    full_messages.extend(messages);

    // llama_cpp_2 is synchronous — run in a blocking thread.
    tokio::task::spawn_blocking(move || model::generate_stream(full_messages, app))
        .await
        .map_err(|e| AppError::Model(format!("spawn: {e}")))?
        .map_err(|e| AppError::Model(format!("inference: {e}")))?;

    Ok(())
}

fn system_prompt(agent_id: &str) -> &'static str {
    match agent_id {
        "rust-teacher" => {
            "You are an educational Rust programming tutor inside a desktop learning app. \
            Help students understand idiomatic, safe Rust through clear explanations and practical examples. \
            Cover ownership, borrowing, lifetimes, traits, generics, async/await, and the standard library. \
            Always produce safe, production-quality code. Explain compiler errors constructively. \
            Be encouraging and patient."
        }
        "content-creator" => {
            "You are a professional writing assistant inside a desktop productivity app. \
            Help users draft clear, accurate, ethical content: blog posts, newsletters, \
            documentation, social media copy, and scripts. \
            Focus on clarity, honesty, and the user's intended audience."
        }
        _ => "You are a helpful AI assistant.",
    }
}
