use serde::{Deserialize, Serialize};
use tauri::State;

use crate::error::AppError;
use crate::state::AppState;

const BASE: &str = "http://127.0.0.1:4200";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub runtime: Option<String>,
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub installed: bool,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[tauri::command]
pub async fn list_skills(state: State<'_, AppState>) -> Result<Vec<Skill>, AppError> {
    let resp = state
        .client
        .get(format!("{BASE}/api/skills"))
        .send()
        .await?;
    let status = resp.status();
    if status.is_success() {
        resp.json::<Vec<Skill>>()
            .await
            .map_err(|e| AppError::Serialization(e.to_string()))
    } else {
        let code = status.as_u16();
        let msg = resp.text().await.unwrap_or_default();
        Err(AppError::Api { status: code, message: msg })
    }
}

#[tauri::command]
pub async fn search_marketplace(
    state: State<'_, AppState>,
    query: String,
) -> Result<Vec<Skill>, AppError> {
    let resp = state
        .client
        .get(format!("{BASE}/api/marketplace/search"))
        .query(&[("q", &query)])
        .send()
        .await?;
    let status = resp.status();
    if status.is_success() {
        resp.json::<Vec<Skill>>()
            .await
            .map_err(|e| AppError::Serialization(e.to_string()))
    } else {
        let code = status.as_u16();
        let msg = resp.text().await.unwrap_or_default();
        Err(AppError::Api { status: code, message: msg })
    }
}
