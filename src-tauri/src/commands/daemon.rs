use tauri::{AppHandle, State};

use crate::error::AppError;
use crate::sidecar;
use crate::state::{AppState, DaemonStatus};

#[derive(serde::Serialize)]
pub struct DaemonStatusResponse {
    pub status: DaemonStatus,
    pub pid: Option<u32>,
    pub error_message: Option<String>,
}

#[tauri::command]
pub fn get_daemon_status(state: State<AppState>) -> DaemonStatusResponse {
    let sc = state.sidecar.lock().unwrap();
    DaemonStatusResponse {
        status: sc.status.clone(),
        pid: sc.pid,
        error_message: sc.error_message.clone(),
    }
}

#[tauri::command]
pub async fn start_daemon(app: AppHandle) -> Result<(), AppError> {
    sidecar::start_daemon(app)
        .await
        .map_err(AppError::Process)
}

#[tauri::command]
pub async fn stop_daemon(app: AppHandle) -> Result<(), AppError> {
    sidecar::stop_daemon(app)
        .await
        .map_err(AppError::Process)
}
