/// Local GGUF model management — download, load, and inference.
///
/// Model: microsoft/bitnet-b1.58-2B-4T (Q4_K_M quantisation)
/// Inference via llama_cpp_2 (Rust bindings to llama.cpp).
use std::path::PathBuf;
use std::sync::{Arc, Mutex, OnceLock};

use llama_cpp_2::context::params::LlamaContextParams;
use llama_cpp_2::llama_backend::LlamaBackend;
use llama_cpp_2::llama_batch::LlamaBatch;
use llama_cpp_2::model::params::LlamaModelParams;
use llama_cpp_2::model::{AddBos, LlamaModel};
use llama_cpp_2::sampling::LlamaSampler;
use tauri::{AppHandle, Emitter, Manager};

use crate::error::AppError;
use crate::state::{AppState, ModelStatus};

const MODEL_FILENAME: &str = "ggml-model-i2_s.gguf";
const MODEL_URL: &str =
    "https://huggingface.co/microsoft/bitnet-b1.58-2B-4T-gguf/resolve/main/ggml-model-i2_s.gguf";

static BACKEND: OnceLock<LlamaBackend> = OnceLock::new();
static MODEL: OnceLock<Arc<Mutex<Option<LlamaModel>>>> = OnceLock::new();

fn global_model() -> &'static Arc<Mutex<Option<LlamaModel>>> {
    MODEL.get_or_init(|| Arc::new(Mutex::new(None)))
}

pub fn model_path(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("app data dir unavailable")
        .join(MODEL_FILENAME)
}

pub fn is_downloaded(app: &AppHandle) -> bool {
    model_path(app).exists()
}

/// Download model from HuggingFace, emitting progress events.
/// Event payload: `{ percent: f32, downloaded_mb: f32, total_mb: f32 }`
pub async fn download_model(app: AppHandle) -> Result<PathBuf, AppError> {
    let path = model_path(&app);
    if path.exists() {
        return Ok(path);
    }

    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }

    let state = app.state::<AppState>();
    {
        let mut ms = state.model.lock().unwrap();
        ms.status = ModelStatus::Downloading;
        ms.progress = 0.0;
    }

    let response = state.client.get(MODEL_URL).send().await?;
    let total = response.content_length().unwrap_or(0);

    let mut downloaded: u64 = 0;
    let mut stream = response.bytes_stream();
    let mut file = tokio::fs::File::create(&path).await?;

    use futures_util::StreamExt;
    use tokio::io::AsyncWriteExt;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| AppError::Network(e.to_string()))?;
        file.write_all(&chunk).await?;
        downloaded += chunk.len() as u64;

        let percent = if total > 0 {
            (downloaded as f32 / total as f32) * 100.0
        } else {
            0.0
        };

        {
            let mut ms = state.model.lock().unwrap();
            ms.progress = percent;
        }

        let _ = app.emit(
            "model://progress",
            serde_json::json!({
                "percent": percent,
                "downloaded_mb": downloaded as f32 / 1_048_576.0,
                "total_mb": total as f32 / 1_048_576.0,
            }),
        );
    }

    file.flush().await?;
    Ok(path)
}

/// Load the GGUF model into memory. Run inside `spawn_blocking`.
pub fn load_model(path: PathBuf) -> Result<(), AppError> {
    let backend = BACKEND.get_or_init(|| {
        LlamaBackend::init().expect("failed to initialise llama backend")
    });

    let params = LlamaModelParams::default();
    let model = LlamaModel::load_from_file(backend, &path, &params)
        .map_err(|e| AppError::Model(format!("load failed: {e}")))?;

    *global_model().lock().unwrap() = Some(model);
    Ok(())
}

/// Synchronous text generation. Call inside `spawn_blocking`.
/// `messages` — `[{ role: "system"|"user"|"assistant", content: String }]`
pub fn generate(messages: &[serde_json::Value]) -> Result<String, AppError> {
    let guard = global_model().lock().unwrap();
    let model = guard
        .as_ref()
        .ok_or_else(|| AppError::Model("model not loaded".into()))?;

    let backend = BACKEND
        .get()
        .ok_or_else(|| AppError::Model("backend not init".into()))?;

    let prompt = build_chatml_prompt(messages);

    let ctx_params = LlamaContextParams::default()
        .with_n_ctx(std::num::NonZeroU32::new(4096));
    let mut ctx = model
        .new_context(backend, ctx_params)
        .map_err(|e| AppError::Model(format!("ctx failed: {e}")))?;

    let tokens = model
        .str_to_token(&prompt, AddBos::Always)
        .map_err(|e| AppError::Model(format!("tokenise: {e}")))?;

    let n_ctx = ctx.n_ctx() as usize;
    if tokens.len() >= n_ctx {
        return Err(AppError::Model("prompt exceeds context window".into()));
    }

    let mut batch = LlamaBatch::new(tokens.len(), 1);
    let last = tokens.len() - 1;
    for (i, &tok) in tokens.iter().enumerate() {
        batch
            .add(tok, i as i32, &[0], i == last)
            .map_err(|e| AppError::Model(format!("batch add: {e}")))?;
    }
    ctx.decode(&mut batch)
        .map_err(|e| AppError::Model(format!("decode: {e}")))?;

    let mut sampler = LlamaSampler::chain_simple([LlamaSampler::greedy()]);
    let mut decoder = encoding_rs::UTF_8.new_decoder();
    let mut output = String::new();
    let n_max = (n_ctx - tokens.len()).min(1024);
    let mut n_cur = tokens.len() as i32;

    for _ in 0..n_max {
        let token = sampler.sample(&ctx, batch.n_tokens() - 1);
        sampler.accept(token);

        if model.is_eog_token(token) {
            break;
        }

        let piece = model
            .token_to_piece(token, &mut decoder, false, None)
            .map_err(|e| AppError::Model(format!("detokenise: {e}")))?;
        output.push_str(&piece);

        batch.clear();
        batch
            .add(token, n_cur, &[0], true)
            .map_err(|e| AppError::Model(format!("batch add: {e}")))?;
        ctx.decode(&mut batch)
            .map_err(|e| AppError::Model(format!("decode: {e}")))?;
        n_cur += 1;
    }

    Ok(output.trim().to_string())
}

/// Streaming generation — emits `model://token` events, then `model://done`.
pub fn generate_stream(
    messages: Vec<serde_json::Value>,
    app: AppHandle,
) -> Result<(), AppError> {
    let guard = global_model().lock().unwrap();
    let model = guard
        .as_ref()
        .ok_or_else(|| AppError::Model("model not loaded".into()))?;

    let backend = BACKEND
        .get()
        .ok_or_else(|| AppError::Model("backend not init".into()))?;

    let prompt = build_chatml_prompt(&messages);

    let ctx_params = LlamaContextParams::default()
        .with_n_ctx(std::num::NonZeroU32::new(4096));
    let mut ctx = model
        .new_context(backend, ctx_params)
        .map_err(|e| AppError::Model(format!("ctx failed: {e}")))?;

    let tokens = model
        .str_to_token(&prompt, AddBos::Always)
        .map_err(|e| AppError::Model(format!("tokenise: {e}")))?;

    let n_ctx = ctx.n_ctx() as usize;
    let n_max = (n_ctx - tokens.len()).min(1024);

    let mut batch = LlamaBatch::new(tokens.len(), 1);
    let last = tokens.len() - 1;
    for (i, &tok) in tokens.iter().enumerate() {
        batch
            .add(tok, i as i32, &[0], i == last)
            .map_err(|e| AppError::Model(format!("batch add: {e}")))?;
    }
    ctx.decode(&mut batch)
        .map_err(|e| AppError::Model(format!("decode: {e}")))?;

    let mut sampler = LlamaSampler::chain_simple([LlamaSampler::greedy()]);
    let mut decoder = encoding_rs::UTF_8.new_decoder();
    let mut n_cur = tokens.len() as i32;

    for _ in 0..n_max {
        let token = sampler.sample(&ctx, batch.n_tokens() - 1);
        sampler.accept(token);

        if model.is_eog_token(token) {
            break;
        }

        let piece = model
            .token_to_piece(token, &mut decoder, false, None)
            .map_err(|e| AppError::Model(format!("detokenise: {e}")))?;

        let _ = app.emit("model://token", &piece);

        batch.clear();
        batch
            .add(token, n_cur, &[0], true)
            .map_err(|e| AppError::Model(format!("batch add: {e}")))?;
        ctx.decode(&mut batch)
            .map_err(|e| AppError::Model(format!("decode: {e}")))?;
        n_cur += 1;
    }

    let _ = app.emit("model://done", ());
    Ok(())
}

fn build_chatml_prompt(messages: &[serde_json::Value]) -> String {
    let mut prompt = String::new();
    for msg in messages {
        let role = msg["role"].as_str().unwrap_or("user");
        let content = msg["content"].as_str().unwrap_or("");
        prompt.push_str(&format!("<|im_start|>{role}\n{content}<|im_end|>\n"));
    }
    prompt.push_str("<|im_start|>assistant\n");
    prompt
}
