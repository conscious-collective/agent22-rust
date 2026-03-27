use serde::{Deserialize, Serialize};
use tauri::State;

use crate::error::AppError;
use crate::state::AppState;

const BASE: &str = "http://127.0.0.1:4200";

// ── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowStep {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub step_type: String,
    #[serde(default)]
    pub agent_id: Option<String>,
    #[serde(default)]
    pub prompt: Option<String>,
    #[serde(default)]
    pub condition: Option<String>,
    #[serde(default)]
    pub config: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workflow {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub steps: Vec<WorkflowStep>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateWorkflowPayload {
    pub name: String,
    pub description: Option<String>,
    pub steps: Vec<WorkflowStep>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowRun {
    pub id: String,
    pub workflow_id: String,
    pub status: String,
    #[serde(default)]
    pub output: Option<serde_json::Value>,
    #[serde(default)]
    pub error: Option<String>,
    #[serde(default)]
    pub started_at: Option<String>,
    #[serde(default)]
    pub completed_at: Option<String>,
    #[serde(default)]
    pub duration_ms: Option<u64>,
}

// ── Commands ─────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn list_workflows(state: State<'_, AppState>) -> Result<Vec<Workflow>, AppError> {
    let resp = state
        .client
        .get(format!("{BASE}/api/workflows"))
        .send()
        .await?;
    handle_json_response(resp).await
}

#[tauri::command]
pub async fn get_workflow(
    state: State<'_, AppState>,
    id: String,
) -> Result<Workflow, AppError> {
    let resp = state
        .client
        .get(format!("{BASE}/api/workflows/{id}"))
        .send()
        .await?;
    handle_json_response(resp).await
}

#[tauri::command]
pub async fn create_workflow(
    state: State<'_, AppState>,
    payload: CreateWorkflowPayload,
) -> Result<Workflow, AppError> {
    let resp = state
        .client
        .post(format!("{BASE}/api/workflows"))
        .json(&payload)
        .send()
        .await?;
    handle_json_response(resp).await
}

#[tauri::command]
pub async fn update_workflow(
    state: State<'_, AppState>,
    id: String,
    payload: CreateWorkflowPayload,
) -> Result<Workflow, AppError> {
    let resp = state
        .client
        .put(format!("{BASE}/api/workflows/{id}"))
        .json(&payload)
        .send()
        .await?;
    handle_json_response(resp).await
}

#[tauri::command]
pub async fn delete_workflow(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    let resp = state
        .client
        .delete(format!("{BASE}/api/workflows/{id}"))
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
pub async fn run_workflow(
    state: State<'_, AppState>,
    id: String,
    input: Option<serde_json::Value>,
) -> Result<WorkflowRun, AppError> {
    let body = serde_json::json!({ "input": input.unwrap_or(serde_json::Value::Null) });
    let resp = state
        .client
        .post(format!("{BASE}/api/workflows/{id}/run"))
        .json(&body)
        .send()
        .await?;
    handle_json_response(resp).await
}

#[tauri::command]
pub async fn list_workflow_runs(
    state: State<'_, AppState>,
    workflow_id: String,
) -> Result<Vec<WorkflowRun>, AppError> {
    let resp = state
        .client
        .get(format!("{BASE}/api/workflows/{workflow_id}/runs"))
        .send()
        .await?;
    handle_json_response(resp).await
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async fn handle_json_response<T: serde::de::DeserializeOwned>(
    resp: reqwest::Response,
) -> Result<T, AppError> {
    let status = resp.status();
    if status.is_success() {
        resp.json::<T>()
            .await
            .map_err(|e| AppError::Serialization(e.to_string()))
    } else {
        let code = status.as_u16();
        let msg = resp.text().await.unwrap_or_default();
        Err(AppError::Api { status: code, message: msg })
    }
}
