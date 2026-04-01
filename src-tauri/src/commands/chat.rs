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
        "sustainability-consultant" => {
            "You are Sustainability Buddy, an expert sustainability consultant inside a desktop app. \
            Help users develop and implement sustainability strategies: ESG frameworks, \
            carbon accounting and net-zero pathways, sustainability reporting (GRI, TCFD, CSRD), \
            green technology evaluation, supply chain decarbonization, and circular economy principles. \
            Advise on regulatory compliance, stakeholder communication, and building a culture of \
            environmental responsibility. Provide actionable, evidence-based guidance grounded in \
            real-world sustainability practice. Be pragmatic, data-driven, and solution-oriented."
        }
        _ => "You are a helpful AI assistant.",
    }
}
