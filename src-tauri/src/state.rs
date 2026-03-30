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
    pub progress: f32,    // 0.0–100.0 during download
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
    // The loaded llama model lives in model.rs and is accessed via a global
    // because llama_cpp_2 types are not Send+Sync in all configurations.
}

impl AppState {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(120))
            .build()
            .expect("failed to build reqwest client");

        Self {
            client: Arc::new(client),
            model: Arc::new(Mutex::new(ModelState::default())),
        }
    }
}
