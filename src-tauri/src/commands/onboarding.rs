use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

use crate::error::AppError;
use crate::model;
use crate::state::{AppState, ModelStatus};

#[derive(Debug, Serialize)]
pub struct ModelStatusDto {
    pub status: ModelStatus,
    pub progress: f32,
    pub error: Option<String>,
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

/// Download (if needed) then load the model into memory.
/// Emits `model://progress` during download, `model://ready` on success,
/// `model://error` on failure.
#[tauri::command]
pub async fn start_model_setup(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    {
        let ms = state.model.lock().unwrap();
        if ms.status == ModelStatus::Ready {
            return Ok(());
        }
    }

    // Download if the file isn't on disk yet
    if !model::is_downloaded(&app) {
        if let Err(e) = model::download_model(app.clone()).await {
            let msg = e.to_string();
            let mut ms = state.model.lock().unwrap();
            ms.status = ModelStatus::Error;
            ms.error = Some(msg.clone());
            let _ = app.emit("model://error", &msg);
            return Err(e);
        }
    }

    // Load into memory (blocking)
    {
        let mut ms = state.model.lock().unwrap();
        ms.status = ModelStatus::Loading;
    }

    let path = model::model_path(&app);
    let state_arc = state.model.clone();
    let app2 = app.clone();

    tokio::task::spawn_blocking(move || {
        match model::load_model(path) {
            Ok(()) => {
                let mut ms = state_arc.lock().unwrap();
                ms.status = ModelStatus::Ready;
                drop(ms);
                let _ = app2.emit("model://ready", ());
            }
            Err(e) => {
                let msg = e.to_string();
                let mut ms = state_arc.lock().unwrap();
                ms.status = ModelStatus::Error;
                ms.error = Some(msg.clone());
                let _ = app2.emit("model://error", &msg);
            }
        }
    })
    .await
    .map_err(|e| AppError::Model(format!("spawn_blocking: {e}")))?;

    Ok(())
}
