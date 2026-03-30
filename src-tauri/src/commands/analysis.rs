use serde_json::Value;
use tauri::{AppHandle, State};

use crate::analysis::{
    self, AnalysisResult, IcpRubric,
};
use crate::error::AppError;
use crate::model;
use crate::state::AppState;

/// Analyse a CSV file:
///   1. Parse CSV
///   2. Ask LLM to discover ICP rubric from columns + sample rows
///   3. Score all records deterministically
///   4. Run KernelSHAP attribution per record
///   5. Ask LLM for a natural-language narrative
#[tauri::command]
pub async fn analyze_csv(
    app: AppHandle,
    state: State<'_, AppState>,
    file_path: String,
) -> Result<AnalysisResult, AppError> {
    // 1. Parse CSV
    let (columns, records) = analysis::parse_csv(&file_path)?;
    if records.is_empty() {
        return Err(AppError::Analysis("CSV has no data rows".into()));
    }

    // 2. Rubric discovery via LLM
    let sample_json = analysis::sample_rows_json(&records, 10);
    let rubric_prompt = analysis::rubric_discovery_prompt(&columns, &sample_json);

    let rubric: IcpRubric = {
        let messages = vec![
            Value::Object({
                let mut m = serde_json::Map::new();
                m.insert("role".into(), "system".into());
                m.insert("content".into(), "You are an ICP analyst. Respond only with valid JSON.".into());
                m
            }),
            Value::Object({
                let mut m = serde_json::Map::new();
                m.insert("role".into(), "user".into());
                m.insert("content".into(), Value::String(rubric_prompt));
                m
            }),
        ];

        let raw = tokio::task::spawn_blocking(move || model::generate(&messages))
            .await
            .map_err(|e| AppError::Model(format!("spawn: {e}")))?
            .map_err(|e| AppError::Model(format!("generate: {e}")))?;

        analysis::parse_rubric_response(&raw)?
    };

    // 3 + 4. Score + KernelSHAP
    let scored = analysis::run_analysis(&records, &rubric);
    let summary = analysis::build_summary(&scored);

    // 5. LLM narrative
    let narrative_prompt = format!(
        "You are an ICP advisor. Here is a summary of a pipeline analysis:\n\
         - Total companies: {total}\n\
         - Tier 1 (strong ICP fit): {t1}\n\
         - Tier 2: {t2}\n\
         - Nurture: {nurture}\n\
         - Top Tier 1 accounts: {top}\n\
         - Top ICP drivers (by Shapley magnitude): {drivers}\n\
         - ICP rationale: {rationale}\n\n\
         Write 3–4 sentences for the sales team explaining the results, key patterns, and what to focus on. Be direct and specific.",
        total = summary.total,
        t1    = summary.tier1,
        t2    = summary.tier2,
        nurture = summary.nurture,
        top   = summary.top_tier1.join(", "),
        drivers = summary.top_drivers.join(", "),
        rationale = rubric.rationale,
    );

    let narrative_msgs = vec![
        Value::Object({
            let mut m = serde_json::Map::new();
            m.insert("role".into(), "user".into());
            m.insert("content".into(), Value::String(narrative_prompt));
            m
        }),
    ];

    let llm_narrative = tokio::task::spawn_blocking(move || model::generate(&narrative_msgs))
        .await
        .map_err(|e| AppError::Model(format!("spawn: {e}")))?
        .unwrap_or_else(|_| "Analysis complete. Review your Tier 1 accounts above.".into());

    Ok(AnalysisResult { rubric, records: scored, summary, llm_narrative })
}
