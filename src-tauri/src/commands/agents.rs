use serde::{Deserialize, Serialize};
use tauri::State;

use crate::error::AppError;
use crate::state::AppState;

const BASE: &str = "http://127.0.0.1:4200";

// ── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub model: Option<String>,
    #[serde(default)]
    pub state: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub created_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateAgentPayload {
    pub name: String,
    pub description: Option<String>,
    pub model: Option<String>,
    pub system_prompt: Option<String>,
    pub tags: Option<Vec<String>>,
    pub tools: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateAgentPayload {
    pub description: Option<String>,
    pub system_prompt: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MessageResponse {
    pub content: String,
    #[serde(default)]
    pub usage: Option<serde_json::Value>,
    #[serde(default)]
    pub conversation_id: Option<String>,
}

// ── Commands ─────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn list_agents(state: State<'_, AppState>) -> Result<Vec<Agent>, AppError> {
    let resp = state
        .client
        .get(format!("{BASE}/api/agents"))
        .send()
        .await?;
    handle_json_response(resp).await
}

#[tauri::command]
pub async fn get_agent(state: State<'_, AppState>, id: String) -> Result<Agent, AppError> {
    let resp = state
        .client
        .get(format!("{BASE}/api/agents/{id}"))
        .send()
        .await?;
    handle_json_response(resp).await
}

#[tauri::command]
pub async fn create_agent(
    state: State<'_, AppState>,
    payload: CreateAgentPayload,
) -> Result<Agent, AppError> {
    // OpenFang expects a TOML manifest or JSON depending on content-type.
    // We'll send as JSON for simplicity.
    let resp = state
        .client
        .post(format!("{BASE}/api/agents"))
        .json(&payload)
        .send()
        .await?;
    handle_json_response(resp).await
}

#[tauri::command]
pub async fn update_agent(
    state: State<'_, AppState>,
    id: String,
    payload: UpdateAgentPayload,
) -> Result<Agent, AppError> {
    let resp = state
        .client
        .put(format!("{BASE}/api/agents/{id}/update"))
        .json(&payload)
        .send()
        .await?;
    handle_json_response(resp).await
}

#[tauri::command]
pub async fn delete_agent(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    let resp = state
        .client
        .delete(format!("{BASE}/api/agents/{id}"))
        .send()
        .await?;
    if resp.status().is_success() {
        Ok(())
    } else {
        let status = resp.status().as_u16();
        let msg = resp.text().await.unwrap_or_default();
        Err(AppError::Api { status, message: msg })
    }
}

#[tauri::command]
pub async fn send_message(
    state: State<'_, AppState>,
    id: String,
    message: String,
    conversation_id: Option<String>,
) -> Result<MessageResponse, AppError> {
    let body = serde_json::json!({
        "message": message,
        "conversation_id": conversation_id,
    });
    let resp = state
        .client
        .post(format!("{BASE}/api/agents/{id}/message"))
        .json(&body)
        .send()
        .await?;
    handle_json_response(resp).await
}

#[tauri::command]
pub async fn reset_session(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    let resp = state
        .client
        .post(format!("{BASE}/api/agents/{id}/session/reset"))
        .send()
        .await?;
    if resp.status().is_success() {
        Ok(())
    } else {
        let status = resp.status().as_u16();
        let msg = resp.text().await.unwrap_or_default();
        Err(AppError::Api { status, message: msg })
    }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async fn handle_json_response<T: serde::de::DeserializeOwned>(
    resp: reqwest::Response,
) -> Result<T, AppError> {
    let status = resp.status();
    if status.is_success() {
        resp.json::<T>().await.map_err(|e| AppError::Serialization(e.to_string()))
    } else {
        let code = status.as_u16();
        let msg = resp.text().await.unwrap_or_default();
        Err(AppError::Api { status: code, message: msg })
    }
}
