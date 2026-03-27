use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use tokio::time::sleep;

use crate::state::{AppState, DaemonStatus, SidecarState};

const OPENFANG_BASE: &str = "http://127.0.0.1:4200";
const HEALTH_URL: &str = "http://127.0.0.1:4200/api/health";

/// Start the bundled OpenFang sidecar daemon.
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

    // Use the bundled sidecar binary (src-tauri/binaries/openfang-<target>)
    let shell = app.shell();
    let result = shell.sidecar("openfang").map(|cmd| cmd.args(["start"]).spawn());

    match result {
        Ok(Ok((_rx, child))) => {
            let pid = child.pid();
            {
                let mut sc = state.sidecar.lock().unwrap();
                sc.pid = Some(pid);
            }

            // Poll until the HTTP server is accepting connections
            let client = state.client.clone();
            let ready = wait_for_ready(&client, 20, Duration::from_millis(500)).await;

            if ready {
                {
                    let mut sc = state.sidecar.lock().unwrap();
                    sc.status = DaemonStatus::Running;
                }
                emit_status(&app, DaemonStatus::Running, None);

                // Start background health monitor
                let app_clone = app.clone();
                let sidecar_ref = state.sidecar.clone();
                let client_clone = state.client.clone();
                tokio::spawn(health_monitor(app_clone, sidecar_ref, client_clone));

                Ok(())
            } else {
                let msg = "Engine failed to start within 10 seconds".to_string();
                {
                    let mut sc = state.sidecar.lock().unwrap();
                    sc.status = DaemonStatus::Error;
                    sc.error_message = Some(msg.clone());
                }
                emit_status(&app, DaemonStatus::Error, Some(msg.clone()));
                Err(msg)
            }
        }
        Ok(Err(e)) | Err(e) => {
            let msg = format!("Failed to start bundled engine: {e}");
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

/// Stop the daemon gracefully via its shutdown endpoint.
pub async fn stop_daemon(app: AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();

    let _ = state
        .client
        .post(format!("{OPENFANG_BASE}/api/shutdown"))
        .send()
        .await;

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

/// Returns true if the daemon is already listening (e.g. started by a previous app session).
pub async fn probe_existing(client: &reqwest::Client) -> bool {
    client
        .get(HEALTH_URL)
        .timeout(Duration::from_secs(2))
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}

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
            sc.error_message = Some("Engine stopped unexpectedly".to_string());
            emit_status(&app, DaemonStatus::Error, sc.error_message.clone());
        }
    }
}

fn emit_status(app: &AppHandle, status: DaemonStatus, error: Option<String>) {
    let _ = app.emit(
        "daemon://status",
        serde_json::json!({ "status": status, "error": error }),
    );
}
