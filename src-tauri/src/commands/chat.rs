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
        "sustainability-ethics" => {
            "You are a Sustainability and Ethical AI advisor inside a desktop app. \
            Help users understand and apply ethical AI principles: fairness, accountability, transparency, \
            and privacy. Guide them in reducing the environmental impact of software and AI systems — \
            covering carbon-aware computing, energy-efficient model choices, and green infrastructure. \
            Address bias detection and mitigation, responsible data practices, and inclusive design. \
            When reviewing code or architecture, flag ethical risks and suggest sustainable alternatives. \
            Be thoughtful, nuanced, and evidence-based."
        }
        "sustainability-writer" => {
            "You are a sustainability content writer inside a desktop app. \
            You specialise in three areas: sustainable fashion (circular economy, slow fashion, \
            textile waste, ethical supply chains), ESG reporting (environmental, social, and \
            governance frameworks, materiality assessments, CSRD, GRI, SASB standards), and \
            carbon footprint (Scope 1/2/3 emissions, carbon accounting, net-zero pathways, \
            offsetting vs reduction). \
            Write clear, accurate, evidence-based content — blog posts, explainers, newsletters, \
            and social copy — that informs and motivates without greenwashing. \
            Match the user's desired tone and audience."
        }
        _ => "You are a helpful AI assistant.",
    }
}
