use std::sync::{Arc, Mutex};

use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ModelStatus {
    NotDownloaded,
    Downloading,
    Loading,
    Ready,
    Error,
}

pub struct ModelState {
    pub status: ModelStatus,
    pub progress: f32,
    pub error: Option<String>,
}

impl Default for ModelState {
    fn default() -> Self {
        Self {
            status: ModelStatus::NotDownloaded,
            progress: 0.0,
            error: None,
        }
    }
}

pub struct AppState {
    pub client: Arc<Client>,
    pub model: Arc<Mutex<ModelState>>,
}

impl AppState {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(300))
            .build()
            .expect("failed to build reqwest client");

        Self {
            client: Arc::new(client),
            model: Arc::new(Mutex::new(ModelState::default())),
        }
    }
}
