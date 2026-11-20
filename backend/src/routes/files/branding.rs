use std::path::PathBuf;

use axum::{
    extract::{Multipart, Path, State},
    http::HeaderMap,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde_json::{json, Value};

use crate::routes::files::stream::stream_disk_image;
use crate::routes::files_auth::require_admin;
use crate::state::AppState;
use crate::util::paths::{
    abs_from_upload_rel, branding_dir, library_banner_upload_dir, rel_path_from_upload,
};

const FAVICON_EXTS: &[&str] = &[".ico", ".png", ".jpg", ".jpeg", ".webp", ".svg"];
const BANNER_EXTS: &[&str] = &[".png", ".jpg", ".jpeg", ".webp"];

fn ext_ok(name: &str, allowed: &[&str]) -> Option<String> {
    let ext = std::path::Path::new(name)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| format!(".{}", e.to_ascii_lowercase()))?;
    if allowed.contains(&ext.as_str()) {
        Some(ext)
    } else {
        None
    }
}

async fn get_favicon(State(state): State<AppState>) -> Result<Response, axum::http::StatusCode> {
    let rel: Option<String> = sqlx::query_scalar(
        r#"SELECT faviconRelPath FROM AppCustomization WHERE id = 1"#,
    )
    .fetch_optional(&state.pool)
    .await
    .ok()
    .flatten()
    .flatten();
    let Some(rel) = rel.filter(|p| !p.is_empty()) else {
        return Err(axum::http::StatusCode::NOT_FOUND);
    };
    let abs = abs_from_upload_rel(&rel);
    stream_disk_image(&abs, "public, max-age=3600").await
}

async fn post_favicon(
    State(state): State<AppState>,
    headers: HeaderMap,
    mut multipart: Multipart,
) -> Result<Json<Value>, (axum::http::StatusCode, Json<Value>)> {
    let _admin = require_admin(&state, &headers)
        .await
        .ok_or((
            axum::http::StatusCode::FORBIDDEN,
            Json(json!({ "error": "Forbidden" })),
        ))?;
    tokio::fs::create_dir_all(branding_dir()).await.ok();
    let mut file_name = None;
    let mut file_data = None;
    while let Some(field) = multipart.next_field().await.map_err(|e| {
        (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({ "error": e.to_string() })),
        )
    })? {
        if field.name() == Some("file") {
            file_name = field.file_name().map(String::from);
            file_data = Some(field.bytes().await.map_err(|e| {
                (
                    axum::http::StatusCode::BAD_REQUEST,
                    Json(json!({ "error": e.to_string() })),
                )
            })?);
        }
    }
    let Some(data) = file_data else {
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({ "error": "No file received" })),
        ));
    };
    if data.len() > 2 * 1024 * 1024 {
        return Err((
            axum::http::StatusCode::PAYLOAD_TOO_LARGE,
            Json(json!({ "error": "File too large" })),
        ));
    }
    let ext = ext_ok(file_name.as_deref().unwrap_or(""), FAVICON_EXTS).ok_or((
        axum::http::StatusCode::BAD_REQUEST,
        Json(json!({ "error": "Invalid favicon type" })),
    ))?;
    let final_abs = branding_dir().join(format!("favicon{ext}"));
    tokio::fs::write(&final_abs, &data).await.map_err(|_| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "write failed" })),
        )
    })?;
    let rel = rel_path_from_upload(&final_abs);
    sqlx::query(
        r#"INSERT INTO AppCustomization (id, faviconRelPath, convertPdfToEpub, updatedAt) VALUES (1, ?, 0, datetime('now'))
           ON CONFLICT(id) DO UPDATE SET faviconRelPath = excluded.faviconRelPath, updatedAt = datetime('now')"#,
    )
    .bind(&rel)
    .execute(&state.pool)
    .await
    .map_err(|_| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "db error" })),
        )
    })?;
    let updated: Option<String> = sqlx::query_scalar(
        r#"SELECT updatedAt FROM AppCustomization WHERE id = 1"#,
    )
    .fetch_optional(&state.pool)
    .await
    .ok()
    .flatten();
    let v = urlencoding::encode(updated.as_deref().unwrap_or(""));
    Ok(Json(json!({ "url": format!("/api/files/branding/favicon?v={v}") })))
}

async fn post_library_banner(
    State(state): State<AppState>,
    headers: HeaderMap,
    mut multipart: Multipart,
) -> Result<Json<Value>, (axum::http::StatusCode, Json<Value>)> {
    let _admin = require_admin(&state, &headers)
        .await
        .ok_or((
            axum::http::StatusCode::FORBIDDEN,
            Json(json!({ "error": "Forbidden" })),
        ))?;
    tokio::fs::create_dir_all(library_banner_upload_dir()).await.ok();
    let mut file_name = None;
    let mut file_data = None;
    while let Some(field) = multipart.next_field().await.map_err(|e| {
        (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({ "error": e.to_string() })),
        )
    })? {
        if field.name() == Some("file") {
            file_name = field.file_name().map(String::from);
            file_data = Some(field.bytes().await.map_err(|e| {
                (
                    axum::http::StatusCode::BAD_REQUEST,
                    Json(json!({ "error": e.to_string() })),
                )
            })?);
        }
    }
    let Some(data) = file_data else {
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({ "error": "No file received" })),
        ));
    };
    if data.len() > 8 * 1024 * 1024 {
        return Err((
            axum::http::StatusCode::PAYLOAD_TOO_LARGE,
            Json(json!({ "error": "File too large" })),
        ));
    }
    let ext = ext_ok(file_name.as_deref().unwrap_or(""), BANNER_EXTS).ok_or((
        axum::http::StatusCode::BAD_REQUEST,
        Json(json!({ "error": "Only .png, .jpg, .jpeg, .webp allowed for library banners" })),
    ))?;
    let name = format!(
        "{}_{}{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0),
        rand::random::<u32>(),
        ext
    );
    let final_abs = library_banner_upload_dir().join(&name);
    tokio::fs::write(&final_abs, &data).await.map_err(|_| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "write failed" })),
        )
    })?;
    let rel = rel_path_from_upload(&final_abs);
    let id: i64 = sqlx::query_scalar(
        r#"INSERT INTO CustomLibraryBanner (relPath) VALUES (?) RETURNING id"#,
    )
    .bind(&rel)
    .fetch_one(&state.pool)
    .await
    .map_err(|_| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "db error" })),
        )
    })?;
    Ok(Json(json!({
        "id": id,
        "url": format!("/api/files/branding/library-banner/{id}")
    })))
}

async fn get_library_banner(
    State(state): State<AppState>,
    Path(id): Path<i64>,
) -> Result<Response, axum::http::StatusCode> {
    if id < 1 {
        return Err(axum::http::StatusCode::BAD_REQUEST);
    }
    let rel: Option<String> = sqlx::query_scalar(
        r#"SELECT relPath FROM CustomLibraryBanner WHERE id = ?"#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;
    let Some(rel) = rel else {
        return Err(axum::http::StatusCode::NOT_FOUND);
    };
    let abs = abs_from_upload_rel(&rel);
    stream_disk_image(&abs, "private, max-age=86400").await
}

async fn delete_library_banner(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i64>,
) -> Result<impl IntoResponse, (axum::http::StatusCode, Json<Value>)> {
    let _admin = require_admin(&state, &headers)
        .await
        .ok_or((
            axum::http::StatusCode::FORBIDDEN,
            Json(json!({ "error": "Forbidden" })),
        ))?;
    if id < 1 {
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Invalid id" })),
        ));
    }
    let rel: Option<String> = sqlx::query_scalar(
        r#"SELECT relPath FROM CustomLibraryBanner WHERE id = ?"#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|_| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "db error" })),
        )
    })?;
    let Some(rel) = rel else {
        return Err((
            axum::http::StatusCode::NOT_FOUND,
            Json(json!({ "error": "Not found" })),
        ));
    };
    sqlx::query(r#"DELETE FROM CustomLibraryBanner WHERE id = ?"#)
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(|_| {
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "db error" })),
            )
        })?;
    let abs: PathBuf = abs_from_upload_rel(&rel);
    let _ = tokio::fs::remove_file(abs).await;
    Ok(axum::http::StatusCode::NO_CONTENT)
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/branding/favicon", get(get_favicon).post(post_favicon))
        .route(
            "/branding/library-banner",
            post(post_library_banner),
        )
        .route(
            "/branding/library-banner/{id}",
            get(get_library_banner).delete(delete_library_banner),
        )
}