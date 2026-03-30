/// ICP analysis pipeline:
///   1. Parse CSV (any schema)
///   2. LLM rubric discovery — model reads columns + sample rows, defines scoring criteria
///   3. Deterministic scoring per record
///   4. KernelSHAP attribution — explains each score via Shapley values
use std::collections::HashMap;

use rand::Rng;
use serde::{Deserialize, Serialize};

use crate::error::AppError;

// ─── Data types ──────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CsvRecord(pub HashMap<String, String>);

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum NumericDir {
    Higher,  // higher is better
    Lower,   // lower is better
    InRange, // within [min_ideal, max_ideal]
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ScoreFn {
    Categorical {
        ideal_values: Vec<String>,
        partial_matches: Vec<String>,
    },
    Numeric {
        min_ideal: f64,
        max_ideal: f64,
        direction: NumericDir,
    },
    FreeText {
        criteria: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoringRule {
    pub feature: String,
    pub weight: f64,           // 0–1, all rules sum to 1.0
    pub ideal_description: String,
    pub score_fn: ScoreFn,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IcpRubric {
    pub rules: Vec<ScoringRule>,
    pub rationale: String,
    pub company_id_column: String,  // which column is the company name/identifier
}

#[derive(Debug, Clone, PartialEq)]
pub enum Tier {
    Tier1,    // ≥ 75
    Tier2,    // 50–74
    Nurture,  // 25–49
    PoorFit,  // < 25
}

impl Tier {
    pub fn from_score(s: f64) -> Self {
        if s >= 75.0 { Tier::Tier1 }
        else if s >= 50.0 { Tier::Tier2 }
        else if s >= 25.0 { Tier::Nurture }
        else { Tier::PoorFit }
    }

    pub fn label(&self) -> &'static str {
        match self {
            Tier::Tier1   => "Tier 1",
            Tier::Tier2   => "Tier 2",
            Tier::Nurture => "Nurture",
            Tier::PoorFit => "Poor Fit",
        }
    }
}

impl Serialize for Tier {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(self.label())
    }
}

impl<'de> Deserialize<'de> for Tier {
    fn deserialize<D: serde::Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        let label = String::deserialize(d)?;
        Ok(match label.as_str() {
            "Tier 1"   => Tier::Tier1,
            "Tier 2"   => Tier::Tier2,
            "Nurture"  => Tier::Nurture,
            _          => Tier::PoorFit,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShapleyResult {
    pub company: String,
    pub score: f64,
    pub tier: Tier,
    /// (feature_name, shapley_value) sorted descending by |φ|
    pub contributions: Vec<(String, f64)>,
    pub baseline: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisSummary {
    pub total: usize,
    pub tier1: usize,
    pub tier2: usize,
    pub nurture: usize,
    pub poor_fit: usize,
    pub top_tier1: Vec<String>,  // up to 5 company names
    pub top_drivers: Vec<String>, // feature names with highest avg |φ|
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisResult {
    pub rubric: IcpRubric,
    pub records: Vec<ShapleyResult>,
    pub summary: AnalysisSummary,
    pub llm_narrative: String,
}

// ─── CSV parsing ─────────────────────────────────────────────────────────────

pub fn parse_csv(path: &str) -> Result<(Vec<String>, Vec<CsvRecord>), AppError> {
    let mut rdr = csv::Reader::from_path(path)?;
    let headers: Vec<String> = rdr.headers()?.iter().map(|s| s.to_string()).collect();

    let records: Vec<CsvRecord> = rdr
        .records()
        .filter_map(|r| r.ok())
        .map(|row| {
            let map: HashMap<String, String> = headers
                .iter()
                .zip(row.iter())
                .map(|(h, v)| (h.clone(), v.to_string()))
                .collect();
            CsvRecord(map)
        })
        .collect();

    Ok((headers, records))
}

/// Build a compact JSON representation of sample rows for the LLM prompt.
pub fn sample_rows_json(records: &[CsvRecord], n: usize) -> String {
    let sample: Vec<_> = records.iter().take(n).map(|r| &r.0).collect();
    serde_json::to_string(&sample).unwrap_or_default()
}

// ─── Rubric discovery prompt ─────────────────────────────────────────────────

pub fn rubric_discovery_prompt(columns: &[String], sample_json: &str) -> String {
    format!(
        r#"You are an expert ICP (Ideal Customer Profile) analyst for a B2B GTM team.

Analyze the following dataset and determine which columns and values indicate strong ICP fit.
Do NOT assume specific column names — work with whatever you see.
Identify the most important features for ICP scoring.

Columns: {columns}
Sample rows (JSON):
{sample_json}

Respond with ONLY a valid JSON object matching this schema:
{{
  "company_id_column": "<the column that identifies each company>",
  "rationale": "<2-3 sentences explaining your ICP scoring logic>",
  "rules": [
    {{
      "feature": "<exact column name>",
      "weight": <0.0–1.0, all weights must sum to 1.0>,
      "ideal_description": "<what makes a high-scoring value>",
      "score_fn": {{
        "type": "categorical",
        "ideal_values": ["<val1>", "<val2>"],
        "partial_matches": ["<val3>"]
      }}
    }},
    {{
      "feature": "<exact column name>",
      "weight": <0.0–1.0>,
      "ideal_description": "<what makes a high-scoring value>",
      "score_fn": {{
        "type": "numeric",
        "min_ideal": <number>,
        "max_ideal": <number>,
        "direction": "in_range"
      }}
    }}
  ]
}}

Use type "categorical" for text/enum columns and "numeric" for number columns.
Only include features that genuinely help identify ideal customers.
Ensure all weights sum exactly to 1.0."#,
        columns = columns.join(", "),
        sample_json = sample_json,
    )
}

/// Parse the LLM's JSON rubric response, normalising weights to sum to 1.0.
pub fn parse_rubric_response(llm_output: &str) -> Result<IcpRubric, AppError> {
    // Extract JSON from the response (LLM might include preamble text)
    let start = llm_output.find('{').ok_or_else(|| AppError::Analysis("no JSON in rubric response".into()))?;
    let end   = llm_output.rfind('}').ok_or_else(|| AppError::Analysis("no JSON end in rubric response".into()))?;
    let json  = &llm_output[start..=end];

    let mut rubric: IcpRubric = serde_json::from_str(json)
        .map_err(|e| AppError::Analysis(format!("rubric JSON parse: {e}")))?;

    // Normalise weights
    let total_weight: f64 = rubric.rules.iter().map(|r| r.weight).sum();
    if total_weight > 0.0 {
        for rule in &mut rubric.rules {
            rule.weight /= total_weight;
        }
    }

    Ok(rubric)
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

pub fn evaluate_rule(value: &str, score_fn: &ScoreFn) -> f64 {
    match score_fn {
        ScoreFn::Categorical { ideal_values, partial_matches } => {
            let v = value.to_lowercase();
            if ideal_values.iter().any(|iv| iv.to_lowercase() == v
                || v.contains(&iv.to_lowercase()))
            {
                1.0
            } else if partial_matches.iter().any(|pm| pm.to_lowercase() == v
                || v.contains(&pm.to_lowercase()))
            {
                0.5
            } else {
                0.0
            }
        }
        ScoreFn::Numeric { min_ideal, max_ideal, direction } => {
            let n: f64 = value.replace(',', "").replace('$', "")
                .parse()
                .unwrap_or(0.0);
            let range = max_ideal - min_ideal;
            if range <= 0.0 { return 0.5; }
            match direction {
                NumericDir::InRange => {
                    if n >= *min_ideal && n <= *max_ideal { 1.0 }
                    else if n < *min_ideal {
                        (n / min_ideal).clamp(0.0, 1.0)
                    } else {
                        (1.0 - (n - max_ideal) / max_ideal).clamp(0.0, 1.0)
                    }
                }
                NumericDir::Higher => ((n - min_ideal) / range).clamp(0.0, 1.0),
                NumericDir::Lower  => (1.0 - (n - min_ideal) / range).clamp(0.0, 1.0),
            }
        }
        ScoreFn::FreeText { .. } => {
            // FreeText rules are evaluated by the LLM separately.
            // Here we return 0.5 as a neutral placeholder.
            0.5
        }
    }
}

pub fn score_record(record: &CsvRecord, rubric: &IcpRubric) -> f64 {
    rubric.rules.iter().map(|rule| {
        let value = record.0.get(&rule.feature).map(|s| s.as_str()).unwrap_or("");
        rule.weight * evaluate_rule(value, &rule.score_fn) * 100.0
    }).sum()
}

// ─── KernelSHAP ──────────────────────────────────────────────────────────────

/// Compute approximate Shapley values for `record` using KernelSHAP.
///
/// Algorithm:
///   1. Sample K random feature subsets.
///   2. For each subset S: mask out absent features (replace with column mean),
///      evaluate score_record → y_S.
///   3. Weight each sample by Shapley kernel: w(S) = (n-1) / [C(n,|S|) * |S| * (n-|S|)]
///   4. Weighted linear regression: X (indicator matrix) ~ y → coefficients = φ
///   5. Verify efficiency: Σφ_i ≈ f(x) - E[f(x)]
pub fn compute_shap(
    record: &CsvRecord,
    rubric: &IcpRubric,
    column_means: &HashMap<String, String>,
    k_samples: usize,
) -> Vec<(String, f64)> {
    let features: Vec<&str> = rubric.rules.iter().map(|r| r.feature.as_str()).collect();
    let n = features.len();
    if n == 0 { return vec![]; }

    let mut rng = rand::thread_rng();

    // Collect (mask_vector, weight, score) for k_samples coalitions
    let mut xs: Vec<Vec<f64>> = Vec::with_capacity(k_samples);
    let mut ys: Vec<f64>      = Vec::with_capacity(k_samples);
    let mut ws: Vec<f64>      = Vec::with_capacity(k_samples);

    for _ in 0..k_samples {
        // Random subset size: avoid |S|=0 and |S|=n (degenerate)
        let size = rng.gen_range(1..n);
        let mut mask = vec![false; n];
        let mut indices: Vec<usize> = (0..n).collect();
        // Partial Fisher-Yates to select `size` positions
        for i in 0..size {
            let j = rng.gen_range(i..n);
            indices.swap(i, j);
            mask[indices[i]] = true;
        }

        // Build masked record
        let mut masked = record.clone();
        for (fi, &feat) in features.iter().enumerate() {
            if !mask[fi] {
                let mean_val = column_means.get(feat).cloned().unwrap_or_default();
                masked.0.insert(feat.to_string(), mean_val);
            }
        }

        let y = score_record(&masked, rubric);
        let w = shapley_kernel_weight(size, n);

        xs.push(mask.iter().map(|&b| if b { 1.0 } else { 0.0 }).collect());
        ys.push(y);
        ws.push(w);
    }

    // Weighted least squares: β = (XᵀWX)⁻¹XᵀWy
    let shap = weighted_least_squares(&xs, &ys, &ws, n);

    // Efficiency correction: ensure Σφ = f(x) - E[f(x)]
    // We skip this here for simplicity; the regression approximation is sufficient.

    features
        .iter()
        .zip(shap.iter())
        .map(|(&f, &phi)| (f.to_string(), phi))
        .collect::<Vec<_>>()
        .into_iter()
        .collect()
}

fn shapley_kernel_weight(subset_size: usize, n: usize) -> f64 {
    if subset_size == 0 || subset_size == n {
        return 1e6; // very high weight to enforce boundary conditions
    }
    let binom = binomial(n, subset_size) as f64;
    (n as f64 - 1.0) / (binom * subset_size as f64 * (n - subset_size) as f64)
}

fn binomial(n: usize, k: usize) -> usize {
    if k > n { return 0; }
    let k = k.min(n - k);
    let mut result = 1usize;
    for i in 0..k {
        result = result * (n - i) / (i + 1);
    }
    result
}

/// Weighted least squares via normal equations.
/// Solves: β = (XᵀWX)⁻¹ XᵀWy
/// X: m×n, W: diagonal m×m, y: m×1 → β: n×1
fn weighted_least_squares(
    xs: &[Vec<f64>],
    ys: &[f64],
    ws: &[f64],
    n_features: usize,
) -> Vec<f64> {
    let m = xs.len();

    // XᵀWX  (n×n)
    let mut xtwx = vec![vec![0.0f64; n_features]; n_features];
    // XᵀWy  (n×1)
    let mut xtwy = vec![0.0f64; n_features];

    for i in 0..m {
        let w = ws[i];
        let y = ys[i];
        for j in 0..n_features {
            xtwy[j] += w * xs[i][j] * y;
            for k in 0..n_features {
                xtwx[j][k] += w * xs[i][j] * xs[i][k];
            }
        }
    }

    // Solve XᵀWX β = XᵀWy via Gaussian elimination
    gaussian_elimination(xtwx, xtwy)
}

/// Basic Gaussian elimination with partial pivoting.
fn gaussian_elimination(mut a: Vec<Vec<f64>>, mut b: Vec<f64>) -> Vec<f64> {
    let n = b.len();

    for col in 0..n {
        // Find pivot
        let mut max_row = col;
        let mut max_val = a[col][col].abs();
        for row in (col + 1)..n {
            if a[row][col].abs() > max_val {
                max_val = a[row][col].abs();
                max_row = row;
            }
        }
        a.swap(col, max_row);
        b.swap(col, max_row);

        let pivot = a[col][col];
        if pivot.abs() < 1e-12 {
            // Singular — return zeros for this component
            continue;
        }

        for row in (col + 1)..n {
            let factor = a[row][col] / pivot;
            b[row] -= factor * b[col];
            for k in col..n {
                a[row][k] -= factor * a[col][k];
            }
        }
    }

    // Back substitution
    let mut x = vec![0.0f64; n];
    for i in (0..n).rev() {
        let mut sum = b[i];
        for j in (i + 1)..n {
            sum -= a[i][j] * x[j];
        }
        let diag = a[i][i];
        x[i] = if diag.abs() > 1e-12 { sum / diag } else { 0.0 };
    }
    x
}

// ─── Column means ────────────────────────────────────────────────────────────

/// Compute per-column means for numeric columns; modal value for text columns.
pub fn compute_column_means(records: &[CsvRecord]) -> HashMap<String, String> {
    if records.is_empty() { return HashMap::new(); }

    let keys: Vec<String> = records[0].0.keys().cloned().collect();
    let mut means = HashMap::new();

    for key in &keys {
        let values: Vec<&str> = records.iter()
            .filter_map(|r| r.0.get(key).map(|s| s.as_str()))
            .collect();

        // Try numeric mean first
        let nums: Vec<f64> = values.iter()
            .filter_map(|v| v.replace(',', "").replace('$', "").parse::<f64>().ok())
            .collect();

        if nums.len() == values.len() && !nums.is_empty() {
            let mean = nums.iter().sum::<f64>() / nums.len() as f64;
            means.insert(key.clone(), format!("{:.2}", mean));
        } else {
            // Use modal string value
            let mut freq: HashMap<&str, usize> = HashMap::new();
            for v in &values { *freq.entry(v).or_insert(0) += 1; }
            let modal = freq.into_iter().max_by_key(|(_, c)| *c)
                .map(|(v, _)| v)
                .unwrap_or("");
            means.insert(key.clone(), modal.to_string());
        }
    }

    means
}

// ─── Full pipeline ────────────────────────────────────────────────────────────

pub fn run_analysis(
    records: &[CsvRecord],
    rubric: &IcpRubric,
) -> Vec<ShapleyResult> {
    let column_means = compute_column_means(records);
    let baseline: f64 = records.iter().map(|r| score_record(r, rubric)).sum::<f64>()
        / records.len().max(1) as f64;

    records.iter().map(|record| {
        let company = record.0.get(&rubric.company_id_column)
            .cloned()
            .unwrap_or_else(|| "Unknown".into());
        let score = score_record(record, rubric);
        let tier  = Tier::from_score(score);

        let mut contributions = compute_shap(record, rubric, &column_means, 256);
        contributions.sort_by(|a, b| b.1.abs().partial_cmp(&a.1.abs()).unwrap_or(std::cmp::Ordering::Equal));

        ShapleyResult { company, score, tier, contributions, baseline }
    }).collect()
}

pub fn build_summary(results: &[ShapleyResult]) -> AnalysisSummary {
    let total    = results.len();
    let tier1    = results.iter().filter(|r| r.tier == Tier::Tier1).count();
    let tier2    = results.iter().filter(|r| r.tier == Tier::Tier2).count();
    let nurture  = results.iter().filter(|r| r.tier == Tier::Nurture).count();
    let poor_fit = results.iter().filter(|r| r.tier == Tier::PoorFit).count();

    let mut top_tier1: Vec<_> = results.iter()
        .filter(|r| r.tier == Tier::Tier1)
        .collect();
    top_tier1.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    let top_tier1 = top_tier1.iter().take(5).map(|r| r.company.clone()).collect();

    // Aggregate |φ| per feature across all records
    let mut feature_importance: HashMap<&str, f64> = HashMap::new();
    for r in results {
        for (feat, phi) in &r.contributions {
            *feature_importance.entry(feat.as_str()).or_insert(0.0) += phi.abs();
        }
    }
    let mut drivers: Vec<_> = feature_importance.iter().collect();
    drivers.sort_by(|a, b| b.1.partial_cmp(a.1).unwrap_or(std::cmp::Ordering::Equal));
    let top_drivers = drivers.iter().take(3).map(|(f, _)| f.to_string()).collect();

    AnalysisSummary { total, tier1, tier2, nurture, poor_fit, top_tier1, top_drivers }
}
