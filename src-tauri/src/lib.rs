mod commands;
mod error;
mod model;
mod state;

use state::AppState;
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::onboarding::get_model_status,
            commands::onboarding::start_model_setup,
            commands::chat::send_message,
        ])
        .setup(|app| {
            // If the model is already on disk, load it in the background so
            // returning users skip the download step entirely.
            let handle = app.handle().clone();
            let model_state = app.state::<AppState>().model.clone();

            tauri::async_runtime::spawn(async move {
                if model::is_downloaded(&handle) {
                    {
                        let mut ms = model_state.lock().unwrap();
                        ms.status = state::ModelStatus::Loading;
                    }
                    let path = model::model_path(&handle);
                    let state_arc = model_state.clone();
                    let h2 = handle.clone();
                    tokio::task::spawn_blocking(move || {
                        match model::load_model(path) {
                            Ok(()) => {
                                let mut ms = state_arc.lock().unwrap();
                                ms.status = state::ModelStatus::Ready;
                                drop(ms);
                                let _ = h2.emit("model://ready", ());
                            }
                            Err(e) => {
                                let msg = e.to_string();
                                let mut ms = state_arc.lock().unwrap();
                                ms.status = state::ModelStatus::Error;
                                ms.error = Some(msg.clone());
                                let _ = h2.emit("model://error", &msg);
                            }
                        }
                    })
                    .await
                    .ok();
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running agent22");
}
