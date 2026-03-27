use std::sync::{Arc, Mutex};
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DaemonStatus {
    Starting,
    Running,
    Stopped,
    Error,
}

pub struct SidecarState {
    pub status: DaemonStatus,
    pub pid: Option<u32>,
    pub error_message: Option<String>,
}

impl Default for SidecarState {
    fn default() -> Self {
        Self {
            status: DaemonStatus::Stopped,
            pid: None,
            error_message: None,
        }
    }
}

pub struct AppState {
    pub client: Arc<Client>,
    pub sidecar: Arc<Mutex<SidecarState>>,
}

impl AppState {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("failed to build reqwest client");

        Self {
            client: Arc::new(client),
            sidecar: Arc::new(Mutex::new(SidecarState::default())),
        }
    }
}
