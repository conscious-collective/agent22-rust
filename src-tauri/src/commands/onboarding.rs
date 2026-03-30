use serde::Serialize;
use tauri::{AppHandle, State};

use crate::error::AppError;
use crate::lead::{is_onboarded, mark_onboarded, submit_lead, LeadData};
use crate::model;
use crate::state::{AppState, ModelStatus};

#[derive(Debug, Serialize)]
pub struct ModelStatusDto {
    pub status: ModelStatus,
    pub progress: f32,
    pub error: Option<String>,
}

#[tauri::command]
pub fn check_onboarded(app: AppHandle) -> bool {
    is_onboarded(&app)
}

#[tauri::command]
pub async fn save_lead(
    app: AppHandle,
    state: State<'_, AppState>,
    lead: LeadData,
) -> Result<(), AppError> {
    submit_lead(&state, &lead).await?;
    mark_onboarded(&app)?;
    Ok(())
}

#[tauri::command]
pub fn get_model_status(state: State<'_, AppState>) -> ModelStatusDto {
    let ms = state.model.lock().unwrap();
    ModelStatusDto {
        status: ms.status.clone(),
        progress: ms.progress,
        error: ms.error.clone(),
    }
}

/// Download (if needed) then load the BitNet model.
/// Emits model://progress events during download, model://ready when done.
#[tauri::command]
pub async fn start_model_setup(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    // Already ready?
    {
        let ms = state.model.lock().unwrap();
        if ms.status == ModelStatus::Ready {
            return Ok(());
        }
    }

    // Download if needed
    if !model::is_downloaded(&app) {
        model::download_model(app.clone()).await?;
    }

    // Load
    {
        let mut ms = state.model.lock().unwrap();
        ms.status = ModelStatus::Loading;
    }

    let path = model::model_path(&app);
    let state_arc = state.model.clone();
    let app2 = app.clone();

    tokio::task::spawn_blocking(move || {
        use tauri::Emitter;
        match model::load_model(path) {
            Ok(()) => {
                let mut ms = state_arc.lock().unwrap();
                ms.status = ModelStatus::Ready;
                let _ = app2.emit("model://ready", ());
            }
            Err(e) => {
                let msg = e.to_string();
                let mut ms = state_arc.lock().unwrap();
                ms.status = ModelStatus::Error;
                ms.error  = Some(msg.clone());
                let _ = app2.emit("model://error", &msg);
            }
        }
    }).await.map_err(|e| AppError::Model(format!("spawn_blocking: {e}")))?;

    Ok(())
}
