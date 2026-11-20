use axum::{
    body::Body,
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::auth::auth_user_from_request;
use crate::services::tts_resolve::resolve_tts_target;
use crate::services::tts_upstream_msg::tts_upstream_connection_message;
use crate::state::AppState;

const MAX_TEXT_LEN: usize = 12_000;

#[derive(Deserialize)]
struct SpeechBody {
    #[serde(rename = "userId")]
    user_id: Option<i64>,
    text: Option<String>,
    voice: Option<String>,
    speed: Option<f64>,
    pitch: Option<f64>,
    response_format: Option<String>,
    model: Option<String>,
}

#[derive(Deserialize)]
struct VoicesQuery {
    #[serde(rename = "userId")]
    user_id: Option<String>,
}

fn parse_user_id(raw: &str) -> Option<i64> {
    let t = raw.trim();
    if t.is_empty() {
        return None;
    }
    t.parse().ok()
}

async fn speech(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<SpeechBody>,
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
    let auth = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok());
    let user = auth_user_from_request(&state.pool, &state.jwt_secret, auth)
        .await
        .ok_or((
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "Unauthenticated" })),
        ))?;
    let user_id = body.user_id.unwrap_or(0);
    if user_id != user.id {
        return Err((
            StatusCode::FORBIDDEN,
            Json(json!({ "error": "Forbidden" })),
        ));
    }
    let text = body.text.as_deref().unwrap_or("");
    if text.trim().is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "text is required" })),
        ));
    }
    if text.len() > MAX_TEXT_LEN {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": format!("text exceeds {MAX_TEXT_LEN} characters") })),
        ));
    }
    let target = resolve_tts_target(&state.pool, user_id)
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, Json(json!({ "error": e }))))?;
    let voice = body
        .voice
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or(target.default_voice.as_str());
    let speed = body.speed.filter(|s| !s.is_nan()).unwrap_or(1.0);
    let model = body
        .model
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or(target.default_model.as_str());
    let response_format = body
        .response_format
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("mp3");
    let mut payload = json!({
        "model": model,
        "input": text,
        "voice": voice,
        "speed": speed,
        "response_format": response_format,
    });
    if let Some(pitch) = body.pitch.filter(|p| !p.is_nan()) {
        if let Some(obj) = payload.as_object_mut() {
            obj.insert("pitch".to_string(), json!(pitch));
        }
    }
    let client = reqwest::Client::new();
    let mut req = client
        .post(&target.speech_url)
        .header("Content-Type", "application/json")
        .json(&payload);
    if let Some(authz) = &target.authorization {
        req = req.header("Authorization", authz);
    }
    let upstream = req.send().await.map_err(|e| {
        (
            StatusCode::BAD_GATEWAY,
            Json(json!({
                "error": tts_upstream_connection_message(&e.to_string(), &target.speech_url)
            })),
        )
    })?;
    let status = upstream.status();
    if !status.is_success() {
        let err_text = upstream.text().await.unwrap_or_default();
        let msg = if err_text.trim().is_empty() {
            format!("Upstream HTTP {status}")
        } else {
            err_text.trim().chars().take(800).collect::<String>()
        };
        return Err((StatusCode::BAD_GATEWAY, Json(json!({ "error": msg }))));
    }
    let ct = upstream
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("audio/mpeg")
        .to_string();
    let bytes = upstream.bytes().await.map_err(|e| {
        (
            StatusCode::BAD_GATEWAY,
            Json(json!({ "error": e.to_string() })),
        )
    })?;
    Ok((
        [(axum::http::header::CONTENT_TYPE, ct), (
            axum::http::header::CACHE_CONTROL,
            "no-store".to_string(),
        )],
        bytes.to_vec(),
    ))
}

async fn voices(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(q): Query<VoicesQuery>,
) -> Result<Response, (StatusCode, Json<Value>)> {
    let auth = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok());
    let user = auth_user_from_request(&state.pool, &state.jwt_secret, auth)
        .await
        .ok_or((
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "Unauthenticated" })),
        ))?;
    let raw = q.user_id.as_deref().unwrap_or("");
    let user_id = parse_user_id(raw).ok_or((
        StatusCode::BAD_REQUEST,
        Json(json!({ "error": "userId required" })),
    ))?;
    if user_id != user.id {
        return Err((
            StatusCode::FORBIDDEN,
            Json(json!({ "error": "Forbidden" })),
        ));
    }
    let target = resolve_tts_target(&state.pool, user_id)
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, Json(json!({ "error": e }))))?;
    let voices_url = target
        .speech_url
        .replace("/v1/audio/speech", "/v1/audio/voices");
    let client = reqwest::Client::new();
    let mut req = client.get(&voices_url);
    if let Some(authz) = &target.authorization {
        req = req.header("Authorization", authz);
    }
    let upstream = req.send().await.map_err(|e| {
        (
            StatusCode::BAD_GATEWAY,
            Json(json!({
                "error": tts_upstream_connection_message(&e.to_string(), &voices_url)
            })),
        )
    })?;
    let status = upstream.status();
    if !status.is_success() {
        let text = upstream.text().await.unwrap_or_default();
        let code = StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY);
        return Ok(Response::builder()
            .status(code)
            .header(axum::http::header::CONTENT_TYPE, "text/plain; charset=utf-8")
            .body(Body::from(text))
            .unwrap());
    }
    let data: Value = upstream.json().await.map_err(|e| {
        (
            StatusCode::BAD_GATEWAY,
            Json(json!({ "error": e.to_string() })),
        )
    })?;
    Ok(Json(data).into_response())
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/speech", post(speech))
        .route("/voices", get(voices))
}