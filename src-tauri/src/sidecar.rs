use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use tokio::time::sleep;

use crate::state::{AppState, DaemonStatus, SidecarState};

const OPENFANG_BASE: &str = "http://127.0.0.1:4200";
const HEALTH_URL: &str = "http://127.0.0.1:4200/api/health";

/// Spawn the bundled sidecar and wait until its HTTP server is ready.
/// Returns `Ok(pid)` on success or `Err(message)` on failure.
/// Does NOT update app state or emit events — callers do that.
async fn spawn_sidecar(app: &AppHandle) -> Result<u32, String> {
    let shell = app.shell();
    let result = shell.sidecar("openfang").map(|cmd| cmd.args(["start"]).spawn());

    match result {
        Ok(Ok((_rx, child))) => {
            let pid = child.pid();
            let state = app.state::<AppState>();
            let ready = wait_for_ready(&state.client, 20, Duration::from_millis(500)).await;
            if ready {
                Ok(pid)
            } else {
                Err("Engine failed to start within 10 seconds".to_string())
            }
        }
        Ok(Err(e)) | Err(e) => Err(format!("Failed to start bundled engine: {e}")),
    }
}

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

    match spawn_sidecar(&app).await {
        Ok(pid) => {
            {
                let mut sc = state.sidecar.lock().unwrap();
                sc.status = DaemonStatus::Running;
                sc.pid = Some(pid);
            }
            emit_status(&app, DaemonStatus::Running, None);

            // Start background health monitor
            let sidecar_ref = state.sidecar.clone();
            let client_clone = state.client.clone();
            tauri::async_runtime::spawn(health_monitor(app.clone(), sidecar_ref, client_clone));

            Ok(())
        }
        Err(msg) => {
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

/// Background loop: polls health every 5 s. On failure, auto-restarts the
/// sidecar with exponential backoff (up to 3 attempts) before giving up.
/// Avoids calling `start_daemon` to prevent an async type cycle.
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
            {
                let mut sc = sidecar.lock().unwrap();
                sc.status = DaemonStatus::Starting;
                sc.error_message = None;
            }
            emit_status(&app, DaemonStatus::Starting, None);

            let mut restarted = false;
            for attempt in 1u32..=3 {
                sleep(Duration::from_secs(2u64.pow(attempt))).await;
                // spawn_sidecar is a plain async fn with no mutual recursion —
                // safe to call from within this loop.
                match spawn_sidecar(&app).await {
                    Ok(pid) => {
                        {
                            let mut sc = sidecar.lock().unwrap();
                            sc.status = DaemonStatus::Running;
                            sc.pid = Some(pid);
                        }
                        emit_status(&app, DaemonStatus::Running, None);
                        restarted = true;
                        break;
                    }
                    Err(_) => continue,
                }
            }

            if !restarted {
                let msg = "Engine stopped and could not be restarted".to_string();
                {
                    let mut sc = sidecar.lock().unwrap();
                    sc.status = DaemonStatus::Error;
                    sc.error_message = Some(msg.clone());
                }
                emit_status(&app, DaemonStatus::Error, Some(msg));
                break;
            }
            // Successfully restarted — continue monitoring in this same loop.
        }
    }
}

fn emit_status(app: &AppHandle, status: DaemonStatus, error: Option<String>) {
    let _ = app.emit(
        "daemon://status",
        serde_json::json!({ "status": status, "error": error }),
    );
}
