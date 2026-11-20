use std::time::{Duration, Instant};

use serde::Serialize;

#[derive(Clone)]
struct Scenario {
    id: &'static str,
    method: &'static str,
    path: &'static str,
    body: Option<&'static str>,
}

const SCENARIOS: &[Scenario] = &[
    Scenario {
        id: "http_health",
        method: "GET",
        path: "/api/health",
        body: None,
    },
    Scenario {
        id: "gql_health",
        method: "POST",
        path: "/api/graphql",
        body: Some(r#"{"query":"{ health }"}"#),
    },
    Scenario {
        id: "gql_libraries",
        method: "POST",
        path: "/api/graphql",
        body: Some(r#"{"query":"{ libraries { id name } }"}"#),
    },
];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LatencyMs {
    min: f64,
    max: f64,
    mean: f64,
    p50: f64,
    p95: f64,
    p99: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ScenarioResult {
    id: String,
    method: String,
    path: String,
    iterations: u32,
    warmup: u32,
    latency_ms: LatencyMs,
    errors: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ProcessSummary {
    rss_bytes: RssStats,
    cpu_seconds_delta: Option<f64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RssStats {
    min: Option<u64>,
    max: Option<u64>,
    mean: Option<f64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PerfReport {
    label: String,
    base_url: String,
    started_at: String,
    finished_at: String,
    duration_ms: u64,
    iterations: u32,
    warmup: u32,
    pid: Option<u32>,
    process_samples: Vec<serde_json::Value>,
    process_summary: ProcessSummary,
    scenarios: Vec<ScenarioResult>,
}

fn percentile(sorted: &[f64], p: f64) -> f64 {
    if sorted.is_empty() {
        return 0.0;
    }
    let idx = ((sorted.len() as f64 * p) - 1.0).clamp(0.0, sorted.len() as f64 - 1.0) as usize;
    sorted[idx]
}

fn summarize(samples: &[f64]) -> LatencyMs {
    if samples.is_empty() {
        return LatencyMs {
            min: 0.0,
            max: 0.0,
            mean: 0.0,
            p50: 0.0,
            p95: 0.0,
            p99: 0.0,
        };
    }
    let mut s = samples.to_vec();
    s.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let sum: f64 = s.iter().sum();
    LatencyMs {
        min: s[0],
        max: s[s.len() - 1],
        mean: sum / s.len() as f64,
        p50: percentile(&s, 0.5),
        p95: percentile(&s, 0.95),
        p99: percentile(&s, 0.99),
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut base_url = "http://127.0.0.1:4000".to_string();
    let mut label = "rust".to_string();
    let mut out: Option<String> = None;
    let mut iterations = 50u32;
    let mut warmup = 5u32;
    let args: Vec<String> = std::env::args().collect();
    let mut i = 1;
    while i < args.len() {
        match args[i].as_str() {
            "--base-url" => {
                base_url = args.get(i + 1).cloned().unwrap_or(base_url);
                i += 2;
            }
            "--label" => {
                label = args.get(i + 1).cloned().unwrap_or(label);
                i += 2;
            }
            "--out" => {
                out = args.get(i + 1).cloned();
                i += 2;
            }
            "--iterations" => {
                iterations = args
                    .get(i + 1)
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(iterations);
                i += 2;
            }
            "--warmup" => {
                warmup = args
                    .get(i + 1)
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(warmup);
                i += 2;
            }
            _ => i += 1,
        }
    }
    let started = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    let t0 = Instant::now();
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()?;
    let mut scenario_rows = Vec::new();
    for sc in SCENARIOS {
        let url = format!("{}{}", base_url.trim_end_matches('/'), sc.path);
        let mut latencies = Vec::new();
        let mut errors = 0u32;
        let total = warmup + iterations;
        for n in 0..total {
            let req0 = Instant::now();
            let res = if sc.method == "GET" {
                client.get(&url).send().await
            } else {
                client
                    .post(&url)
                    .header("content-type", "application/json")
                    .body(sc.body.unwrap_or("{}"))
                    .send()
                    .await
            };
            let ms = req0.elapsed().as_secs_f64() * 1000.0;
            if n >= warmup {
                match res {
                    Ok(r) if r.status().is_success() => latencies.push(ms),
                    _ => {
                        errors += 1;
                        latencies.push(ms);
                    }
                }
            }
        }
        scenario_rows.push(ScenarioResult {
            id: sc.id.to_string(),
            method: sc.method.to_string(),
            path: sc.path.to_string(),
            iterations,
            warmup,
            latency_ms: summarize(&latencies),
            errors,
        });
    }
    let finished = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    let report = PerfReport {
        label,
        base_url,
        started_at: started,
        finished_at: finished,
        duration_ms: t0.elapsed().as_millis() as u64,
        iterations,
        warmup,
        pid: Some(std::process::id()),
        process_samples: vec![],
        process_summary: ProcessSummary {
            rss_bytes: RssStats {
                min: None,
                max: None,
                mean: None,
            },
            cpu_seconds_delta: None,
        },
        scenarios: scenario_rows,
    };
    let json = serde_json::to_string_pretty(&report)?;
    if let Some(path) = out {
        std::fs::write(path, json)?;
    } else {
        println!("{json}");
    }
    Ok(())
}
