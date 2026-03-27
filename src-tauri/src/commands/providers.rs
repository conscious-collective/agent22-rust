use serde::{Deserialize, Serialize};
use tauri::State;

use crate::error::AppError;
use crate::state::AppState;

const BASE: &str = "http://127.0.0.1:4200";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Provider {
    pub name: String,
    pub display_name: String,
    pub authenticated: bool,
    #[serde(default)]
    pub base_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Model {
    pub id: String,
    pub name: String,
    pub provider: String,
    #[serde(default)]
    pub context_window: Option<u32>,
    #[serde(default)]
    pub supports_tools: bool,
    #[serde(default)]
    pub supports_vision: bool,
    #[serde(default)]
    pub supports_streaming: bool,
    #[serde(default)]
    pub tier: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SetProviderKeyPayload {
    pub key: String,
}

#[tauri::command]
pub async fn list_providers(state: State<'_, AppState>) -> Result<Vec<Provider>, AppError> {
    let resp = state
        .client
        .get(format!("{BASE}/api/providers"))
        .send()
        .await?;
    handle_json_response(resp).await
}

#[tauri::command]
pub async fn list_models(state: State<'_, AppState>) -> Result<Vec<Model>, AppError> {
    let resp = state
        .client
        .get(format!("{BASE}/api/models"))
        .send()
        .await?;
    handle_json_response(resp).await
}

#[tauri::command]
pub async fn set_provider_key(
    state: State<'_, AppState>,
    provider: String,
    key: String,
) -> Result<(), AppError> {
    let payload = SetProviderKeyPayload { key };
    let resp = state
        .client
        .post(format!("{BASE}/api/providers/{provider}/key"))
        .json(&payload)
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
pub async fn test_provider(
    state: State<'_, AppState>,
    provider: String,
) -> Result<bool, AppError> {
    let resp = state
        .client
        .post(format!("{BASE}/api/providers/{provider}/test"))
        .send()
        .await?;
    Ok(resp.status().is_success())
}

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
