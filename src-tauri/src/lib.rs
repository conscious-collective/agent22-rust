mod commands;
mod error;
mod sidecar;
mod state;

use state::AppState;
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            // daemon
            commands::daemon::get_daemon_status,
            commands::daemon::start_daemon,
            commands::daemon::stop_daemon,
            // agents
            commands::agents::list_agents,
            commands::agents::get_agent,
            commands::agents::create_agent,
            commands::agents::update_agent,
            commands::agents::delete_agent,
            commands::agents::send_message,
            commands::agents::reset_session,
            // workflows
            commands::workflows::list_workflows,
            commands::workflows::get_workflow,
            commands::workflows::create_workflow,
            commands::workflows::update_workflow,
            commands::workflows::delete_workflow,
            commands::workflows::run_workflow,
            commands::workflows::list_workflow_runs,
            // skills
            commands::skills::list_skills,
            commands::skills::search_marketplace,
            // providers
            commands::providers::list_providers,
            commands::providers::list_models,
            commands::providers::set_provider_key,
            commands::providers::test_provider,
        ])
        .setup(|app| {
            // On startup, check if daemon is already running; if not, auto-start it.
            let handle = app.handle().clone();
            let client = app.state::<AppState>().client.clone();
            tauri::async_runtime::spawn(async move {
                let already_up = sidecar::probe_existing(&client).await;
                if already_up {
                    // Update state to reflect existing daemon
                    if let Some(state) = handle.try_state::<AppState>() {
                        let mut sc = state.sidecar.lock().unwrap();
                        sc.status = state::DaemonStatus::Running;
                    }
                    let _ = handle.emit(
                        "daemon://status",
                        serde_json::json!({ "status": "running", "error": null }),
                    );
                } else {
                    let _ = sidecar::start_daemon(handle).await;
                }
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let handle = window.app_handle().clone();
                tauri::async_runtime::spawn(async move {
                    let _ = sidecar::stop_daemon(handle).await;
                });
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running agent22");
}
