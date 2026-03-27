use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use tokio::time::sleep;

use crate::state::{AppState, DaemonStatus, SidecarState};

const OPENFANG_BASE: &str = "http://127.0.0.1:4200";
const HEALTH_URL: &str = "http://127.0.0.1:4200/api/health";

/// Attempt to start the OpenFang daemon. Tries to use `openfang` from PATH.
pub async fn start_daemon(app: AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();

    {
        let mut sc = state.sidecar.lock().unwrap();
        if sc.status == DaemonStatus::Running || sc.status == DaemonStatus::Starting {
            return Ok(());
        }
        sc.status = DaemonStatus::Starting;
        sc.error_message = None;
    }

    emit_status(&app, DaemonStatus::Starting, None);

    // Spawn openfang start as a background process via the shell plugin
    let shell = app.shell();
    let result = shell
        .command("openfang")
        .args(["start"])
        .spawn();

    match result {
        Ok((_rx, child)) => {
            let pid = child.pid();
            {
                let mut sc = state.sidecar.lock().unwrap();
                sc.pid = Some(pid);
            }

            // Wait for the daemon to be ready (poll health endpoint)
            let client = state.client.clone();
            let ready = wait_for_ready(&client, 20, Duration::from_millis(500)).await;

            if ready {
                let mut sc = state.sidecar.lock().unwrap();
                sc.status = DaemonStatus::Running;
                emit_status(&app, DaemonStatus::Running, None);

                // Spawn background health monitor
                let app_clone = app.clone();
                let sidecar_ref = state.sidecar.clone();
                let client_clone = state.client.clone();
                tokio::spawn(health_monitor(app_clone, sidecar_ref, client_clone));

                Ok(())
            } else {
                let msg = "Daemon failed to start within 10 seconds".to_string();
                {
                    let mut sc = state.sidecar.lock().unwrap();
                    sc.status = DaemonStatus::Error;
                    sc.error_message = Some(msg.clone());
                }
                emit_status(&app, DaemonStatus::Error, Some(msg.clone()));
                Err(msg)
            }
        }
        Err(e) => {
            let msg = format!("Failed to spawn openfang: {e}. Is it installed? Run: cargo install --git https://github.com/RightNow-AI/openfang openfang-cli");
            {
                let mut sc = state.sidecar.lock().unwrap();
                sc.status = DaemonStatus::Error;
                sc.error_message = Some(msg.clone());
            }
            emit_status(&app, DaemonStatus::Error, Some(msg.clone()));
            Err(msg)
        }
    }
}

/// Stop the OpenFang daemon gracefully via its shutdown API endpoint.
pub async fn stop_daemon(app: AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();
    let client = state.client.clone();

    // Try graceful shutdown first
    let _ = client
        .post(format!("{OPENFANG_BASE}/api/shutdown"))
        .send()
        .await;

    // Give it a moment
    sleep(Duration::from_millis(500)).await;

    {
        let mut sc = state.sidecar.lock().unwrap();
        sc.status = DaemonStatus::Stopped;
        sc.pid = None;
        sc.error_message = None;
    }
    emit_status(&app, DaemonStatus::Stopped, None);
    Ok(())
}

/// Poll the health endpoint until the daemon responds or timeout is reached.
async fn wait_for_ready(client: &reqwest::Client, attempts: u32, delay: Duration) -> bool {
    for _ in 0..attempts {
        if let Ok(resp) = client.get(HEALTH_URL).send().await {
            if resp.status().is_success() {
                return true;
            }
        }
        sleep(delay).await;
    }
    false
}

/// Background task that polls the health endpoint every 5 seconds.
async fn health_monitor(
    app: AppHandle,
    sidecar: Arc<Mutex<SidecarState>>,
    client: Arc<reqwest::Client>,
) {
    loop {
        sleep(Duration::from_secs(5)).await;

        let current_status = {
            let sc = sidecar.lock().unwrap();
            sc.status.clone()
        };

        if current_status == DaemonStatus::Stopped {
            break;
        }

        let alive = client
            .get(HEALTH_URL)
            .timeout(Duration::from_secs(3))
            .send()
            .await
            .map(|r| r.status().is_success())
            .unwrap_or(false);

        if !alive && current_status == DaemonStatus::Running {
            let mut sc = sidecar.lock().unwrap();
            sc.status = DaemonStatus::Error;
            sc.error_message = Some("Daemon stopped unexpectedly".to_string());
            emit_status(&app, DaemonStatus::Error, sc.error_message.clone());
        }
    }
}

fn emit_status(app: &AppHandle, status: DaemonStatus, error: Option<String>) {
    use serde_json::json;
    let _ = app.emit(
        "daemon://status",
        json!({ "status": status, "error": error }),
    );
}

/// Check if daemon is already running (survives across restarts).
pub async fn probe_existing(client: &reqwest::Client) -> bool {
    client
        .get(HEALTH_URL)
        .timeout(Duration::from_secs(2))
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}
