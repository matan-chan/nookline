use crate::services::tts_resolve::ResolvedTtsTarget;

const PROBE_TEXT: &str = "Hi.";
const MIN_PROBE_AUDIO_BYTES: usize = 48;
const PROBE_TIMEOUT_MS: u64 = 20_000;
const PROBE_ERROR_BODY_MAX: usize = 400;
const JSON_LIKE_PREFIX: usize = 240;

pub struct TtsProbeResult {
    pub ok: bool,
    pub error: Option<String>,
}

pub async fn probe_tts_synthesis(target: &ResolvedTtsTarget) -> TtsProbeResult {
    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_millis(PROBE_TIMEOUT_MS))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return TtsProbeResult {
                ok: false,
                error: Some(e.to_string()),
            };
        }
    };
    let body = serde_json::json!({
        "model": target.default_model,
        "input": PROBE_TEXT,
        "voice": target.default_voice,
        "speed": 1,
        "response_format": "mp3",
    });
    let mut req = client
        .post(&target.speech_url)
        .header("Content-Type", "application/json")
        .json(&body);
    if let Some(auth) = &target.authorization {
        req = req.header("Authorization", auth);
    }
    let upstream = match req.send().await {
        Ok(r) => r,
        Err(e) => {
            return TtsProbeResult {
                ok: false,
                error: Some(format!("TTS upstream: {e}")),
            };
        }
    };
    let status = upstream.status();
    if !status.is_success() {
        let detail = upstream
            .text()
            .await
            .unwrap_or_default()
            .trim()
            .chars()
            .take(PROBE_ERROR_BODY_MAX)
            .collect::<String>();
        let msg = if detail.is_empty() {
            format!("HTTP {status}")
        } else {
            detail
        };
        return TtsProbeResult {
            ok: false,
            error: Some(msg),
        };
    }
    let ct = upstream
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();
    let bytes = match upstream.bytes().await {
        Ok(b) => b,
        Err(e) => {
            return TtsProbeResult {
                ok: false,
                error: Some(e.to_string()),
            };
        }
    };
    if bytes.len() < MIN_PROBE_AUDIO_BYTES {
        return TtsProbeResult {
            ok: false,
            error: Some(format!(
                "TTS returned only {} bytes (expected audio data)",
                bytes.len()
            )),
        };
    }
    if ct.contains("json") || ct.contains("text/") {
        let head = std::str::from_utf8(&bytes[..bytes.len().min(JSON_LIKE_PREFIX)])
            .unwrap_or("")
            .trim();
        if head.starts_with('{') || head.starts_with('[') {
            return TtsProbeResult {
                ok: false,
                error: Some(head.chars().take(PROBE_ERROR_BODY_MAX).collect::<String>()),
            };
        }
    }
    TtsProbeResult {
        ok: true,
        error: None,
    }
}
