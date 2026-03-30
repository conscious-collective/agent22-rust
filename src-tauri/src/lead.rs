/// Lead collection — submits onboarding form data to Web3Forms + Cloudflare Worker.
use serde::{Deserialize, Serialize};
use tauri::State;
use tauri_plugin_store::StoreExt;

use crate::error::AppError;
use crate::state::AppState;

const ONBOARDED_KEY: &str   = "onboarded";
const WEB3FORMS_URL: &str   = "https://api.web3forms.com/submit";
const WEB3FORMS_KEY: &str   = "d2f11076-605a-4f77-8f37-70fa0dd5970e";
const REGISTER_URL: &str    = "https://agent22.io/api/register";
const STORE_FILENAME: &str  = "agent22.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeadData {
    pub name: String,
    pub email: String,
    pub company: Option<String>,
    pub revenue: Option<String>,
    pub challenge: Option<String>,
}

/// Submit lead to both Web3Forms (email delivery) and Cloudflare Worker (KV storage).
/// Failures are logged but not fatal — onboarding should not be blocked by network issues.
pub async fn submit_lead(state: &State<'_, AppState>, lead: &LeadData) -> Result<(), AppError> {
    let client = &state.client;

    // Web3Forms submission (same format as agent22-web's LeadForm.astro)
    let web3_payload = serde_json::json!({
        "access_key": WEB3FORMS_KEY,
        "subject":    "Agent22 Desktop Lead",
        "from_name":  "Agent22 Desktop",
        "name":       lead.name,
        "email":      lead.email,
        "company":    lead.company.clone().unwrap_or_default(),
        "revenue":    lead.revenue.clone().unwrap_or_default(),
        "challenge":  lead.challenge.clone().unwrap_or_default(),
        "source":     "desktop",
    });

    // Cloudflare Worker submission
    let cf_payload = serde_json::json!({
        "name":      lead.name,
        "email":     lead.email,
        "company":   lead.company,
        "revenue":   lead.revenue,
        "challenge": lead.challenge,
        "source":    "desktop",
    });

    // Fire both concurrently; ignore errors (offline is acceptable)
    let (w3_res, cf_res) = tokio::join!(
        client.post(WEB3FORMS_URL).json(&web3_payload).send(),
        client.post(REGISTER_URL).json(&cf_payload).send(),
    );

    if let Err(e) = w3_res { tracing::warn!("web3forms error: {e}"); }
    if let Err(e) = cf_res { tracing::warn!("cloudflare register error: {e}"); }

    Ok(())
}

pub fn mark_onboarded(app: &tauri::AppHandle) -> Result<(), AppError> {
    let store = app.store(STORE_FILENAME)
        .map_err(|e| AppError::Io(format!("store error: {e}")))?;
    store.set(ONBOARDED_KEY, serde_json::Value::Bool(true));
    store.save().map_err(|e| AppError::Io(format!("store save: {e}")))?;
    Ok(())
}

pub fn is_onboarded(app: &tauri::AppHandle) -> bool {
    app.store(STORE_FILENAME)
        .map(|store| store.get(ONBOARDED_KEY).and_then(|v| v.as_bool()).unwrap_or(false))
        .unwrap_or(false)
}
