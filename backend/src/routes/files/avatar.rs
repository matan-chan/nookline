use std::path::PathBuf;

use axum::{
    extract::{Multipart, Path, State},
    http::{HeaderMap, StatusCode},
    response::Response,
    routing::{get, post},
    Json, Router,
};
use serde_json::{json, Value};

use crate::routes::files::stream::stream_disk_image;
use crate::routes::files_auth::{require_admin, require_user};
use crate::state::AppState;
use crate::util::paths::{abs_from_upload_rel, avatar_dir, rel_path_from_upload};

const ALLOWED: &[&str] = &[".png", ".jpg", ".jpeg", ".webp"];

async fn avatar_me(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Response, StatusCode> {
    let user = require_user(&state, &headers)
        .await
        .ok_or(StatusCode::UNAUTHORIZED)?;
    let Some(rel) = user.avatar_rel_path.as_ref().filter(|p| !p.is_empty()) else {
        return Err(StatusCode::NOT_FOUND);
    };
    let abs = abs_from_upload_rel(rel);
    stream_disk_image(&abs, "private, no-cache").await
}

async fn avatar_user(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(user_id): Path<i64>,
) -> Result<Response, StatusCode> {
    let _ = require_admin(&state, &headers)
        .await
        .ok_or(StatusCode::FORBIDDEN)?;
    if user_id < 1 {
        return Err(StatusCode::BAD_REQUEST);
    }
    let rel: Option<String> =
        sqlx::query_scalar(r#"SELECT avatarRelPath FROM User WHERE id = ?"#)
            .bind(user_id)
            .fetch_optional(&state.pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
            .flatten();
    let Some(rel) = rel.filter(|p| !p.is_empty()) else {
        return Err(StatusCode::NOT_FOUND);
    };
    let abs = abs_from_upload_rel(&rel);
    stream_disk_image(&abs, "private, no-cache").await
}

fn safe_ext(name: &str) -> Option<String> {
    let ext = std::path::Path::new(name)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| format!(".{}", e.to_ascii_lowercase()))?;
    if ALLOWED.contains(&ext.as_str()) {
        Some(ext)
    } else {
        None
    }
}

async fn post_avatar(
    State(state): State<AppState>,
    headers: HeaderMap,
    mut multipart: Multipart,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let user = require_user(&state, &headers)
        .await
        .ok_or((
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "Unauthenticated" })),
        ))?;
    tokio::fs::create_dir_all(avatar_dir()).await.ok();
    let mut file_name = None;
    let mut file_data = None;
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))))?
    {
        if field.name() == Some("file") {
            file_name = field.file_name().map(String::from);
            file_data = Some(
                field
                    .bytes()
                    .await
                    .map_err(|e| (StatusCode::BAD_REQUEST, Json(json!({ "error": e.to_string() }))))?,
            );
        }
    }
    let Some(data) = file_data else {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "No file received" })),
        ));
    };
    let ext = safe_ext(file_name.as_deref().unwrap_or("")).ok_or((
        StatusCode::BAD_REQUEST,
        Json(json!({ "error": "Invalid image type" })),
    ))?;
    let final_abs = avatar_dir().join(format!("user-{}{ext}", user.id));
    if let Some(old) = user.avatar_rel_path.as_ref() {
        let old_abs = abs_from_upload_rel(old);
        if old_abs != final_abs {
            let _ = tokio::fs::remove_file(old_abs).await;
        }
    }
    tokio::fs::write(&final_abs, &data)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Failed to store avatar" })),
            )
        })?;
    let rel = rel_path_from_upload(&final_abs);
    sqlx::query(r#"UPDATE User SET avatarRelPath = ?, updatedAt = datetime('now') WHERE id = ?"#)
        .bind(&rel)
        .bind(user.id)
        .execute(&state.pool)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "db error" })),
            )
        })?;
    Ok(Json(json!({ "ok": true, "hasAvatar": true })))
}

async fn delete_avatar(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<StatusCode, StatusCode> {
    let user = require_user(&state, &headers)
        .await
        .ok_or(StatusCode::UNAUTHORIZED)?;
    let rel: Option<String> =
        sqlx::query_scalar(r#"SELECT avatarRelPath FROM User WHERE id = ?"#)
            .bind(user.id)
            .fetch_optional(&state.pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    sqlx::query(r#"UPDATE User SET avatarRelPath = NULL, updatedAt = datetime('now') WHERE id = ?"#)
        .bind(user.id)
        .execute(&state.pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    if let Some(rel) = rel.filter(|p| !p.is_empty()) {
        let abs: PathBuf = abs_from_upload_rel(&rel);
        let _ = tokio::fs::remove_file(abs).await;
    }
    Ok(StatusCode::NO_CONTENT)
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/avatar/me", get(avatar_me))
        .route("/avatar/user/{user_id}", get(avatar_user))
        .route("/avatar", post(post_avatar).delete(delete_avatar))
}