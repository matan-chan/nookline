use std::path::PathBuf;

use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::routes::files::stream::{stream_bytes, stream_file_with_range};
use crate::routes::files_auth::{require_user, require_user_for_cover};
use crate::routes::rest_parse::parse_positive_id;
use crate::services::cover_serve::{
    cover_bytes_mime, parse_cover_width, serve_optimized_local_cover, serve_optimized_ol_cover,
    CoverServeError,
};
use crate::state::AppState;
use crate::util::paths::resolve_book_file_on_disk;
use sqlx::SqlitePool;

fn cover_abs_path(stored: &str) -> PathBuf {
    let mut src = PathBuf::from(stored.trim());
    if !src.is_absolute() {
        src = crate::util::paths::abs_from_upload_rel(stored.trim());
    }
    src
}

async fn resolve_stored_or_derived_cover_path(
    pool: &SqlitePool,
    book_id: i64,
    stored: Option<String>,
) -> Option<String> {
    let mut path = stored.filter(|p| !p.trim().is_empty());
    if let Some(ref p) = path {
        if !cover_abs_path(p).exists() {
            path = None;
        }
    }
    if path.is_none() {
        path = crate::services::book::persist_book_derived_cover_if_possible(pool, book_id).await;
    }
    path
}

async fn serve_local_cover_path(path: &str, book_id: i64, width: u32) -> Result<Response, CoverServeError> {
    let src = cover_abs_path(path);
    let bytes = serve_optimized_local_cover(&src, &format!("book-{book_id}"), width).await?;
    let mime = cover_bytes_mime(&bytes, &src);
    Ok(stream_bytes(bytes, mime, "private, max-age=86400").await)
}

#[derive(Deserialize)]
pub struct CoverQuery {
    pub token: Option<String>,
    pub w: Option<String>,
    pub width: Option<String>,
}

#[derive(Deserialize)]
pub struct OlCoverQuery {
    #[serde(rename = "bookId")]
    pub book_id: Option<String>,
    pub w: Option<String>,
    pub width: Option<String>,
}

#[derive(Deserialize)]
pub struct PostCoverBody {
    #[serde(rename = "coverImagePath")]
    pub cover_image_path: String,
}

async fn book_file(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(book_id_raw): Path<String>,
) -> Result<Response, (StatusCode, Json<Value>)> {
    let book_id = parse_positive_id(&book_id_raw, "book id")?;
    let user = require_user(&state, &headers)
        .await
        .ok_or((
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "Unauthenticated" })),
        ))?;
    #[derive(sqlx::FromRow)]
    struct BookPathRow {
        #[sqlx(rename = "filePath")]
        file_path: String,
        #[sqlx(rename = "libraryPath")]
        library_path: String,
    }
    let row: BookPathRow = sqlx::query_as(
        r#"SELECT b.filePath as filePath, l.path as libraryPath FROM Book b JOIN Library l ON b.libraryId = l.id WHERE b.id = ? AND l.userId = ?"#,
    )
    .bind(book_id)
    .bind(user.id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "db error" })),
        )
    })?
    .ok_or((
        StatusCode::NOT_FOUND,
        Json(json!({ "error": "Book not found" })),
    ))?;
    let abs = resolve_book_file_on_disk(&row.library_path, &row.file_path);
    stream_file_with_range(&headers, &abs).await.map_err(|_| {
        (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "File not found" })),
        )
    })
}

async fn book_cover(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(book_id_raw): Path<String>,
    Query(q): Query<CoverQuery>,
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
    let book_id = parse_positive_id(&book_id_raw, "book id")?;
    let user = require_user_for_cover(&state, &headers, q.token.as_deref())
        .await
        .ok_or((
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "Unauthenticated" })),
        ))?;
    let cover: Option<String> = sqlx::query_scalar(
        r#"SELECT b.coverImagePath FROM Book b JOIN Library l ON b.libraryId = l.id WHERE b.id = ? AND l.userId = ?"#,
    )
    .bind(book_id)
    .bind(user.id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "db error" })),
        )
    })?
    .flatten();
    let width = parse_cover_width(q.w.as_deref(), q.width.as_deref());
    let path = resolve_stored_or_derived_cover_path(&state.pool, book_id, cover).await;
    let Some(path) = path else {
        return Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Cover not found" })),
        ));
    };
    match serve_local_cover_path(&path, book_id, width).await {
        Ok(resp) => Ok(resp),
        Err(CoverServeError::NotFound) | Err(CoverServeError::Unsupported) => {
            if let Some(derived) =
                crate::services::book::persist_book_derived_cover_if_possible(&state.pool, book_id).await
            {
                if derived != path {
                    if let Ok(resp) = serve_local_cover_path(&derived, book_id, width).await {
                        return Ok(resp);
                    }
                }
            }
            Err((
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Cover not found" })),
            ))
        }
        Err(_) => Err((
            StatusCode::BAD_GATEWAY,
            Json(json!({ "error": "Could not optimize cover" })),
        )),
    }
}

async fn ol_cover(
    State(state): State<AppState>,
    Path(ol_id_raw): Path<String>,
    Query(q): Query<OlCoverQuery>,
) -> Result<impl IntoResponse, (StatusCode, Json<Value>)> {
    let ol_id = parse_positive_id(&ol_id_raw, "cover id")?;
    let width = parse_cover_width(q.w.as_deref(), q.width.as_deref());
    match serve_optimized_ol_cover(ol_id, width).await {
        Ok(bytes) => Ok(stream_bytes(bytes, "image/webp", "public, max-age=86400").await),
        Err(CoverServeError::NotFound) | Err(CoverServeError::Upstream(_)) => {
            if let Some(raw) = q.book_id.as_deref() {
                if let Ok(book_id) = raw.parse::<i64>() {
                    if book_id > 0 {
                        if let Some(path) =
                            crate::services::book::persist_book_derived_cover_if_possible(
                                &state.pool,
                                book_id,
                            )
                            .await
                        {
                            let src = std::path::PathBuf::from(path);
                            if let Ok(bytes) = serve_optimized_local_cover(
                                &src,
                                &format!("book-{book_id}"),
                                width,
                            )
                            .await
                            {
                                let mime = cover_bytes_mime(&bytes, &src);
                                return Ok(stream_bytes(
                                    bytes,
                                    mime,
                                    "private, max-age=86400",
                                )
                                .await);
                            }
                        }
                    }
                }
            }
            Err((
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Cover source unavailable" })),
            ))
        }
        Err(_) => Err((
            StatusCode::BAD_GATEWAY,
            Json(json!({ "error": "Could not optimize cover" })),
        )),
    }
}

async fn post_cover(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(book_id_raw): Path<String>,
    Json(body): Json<PostCoverBody>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let book_id = parse_positive_id(&book_id_raw, "book id")?;
    let user = require_user(&state, &headers)
        .await
        .ok_or((
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "Unauthenticated" })),
        ))?;
    let owned: Option<i64> = sqlx::query_scalar(
        r#"SELECT b.id FROM Book b JOIN Library l ON b.libraryId = l.id WHERE b.id = ? AND l.userId = ?"#,
    )
    .bind(book_id)
    .bind(user.id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "db error" })),
        )
    })?;
    if owned.is_none() {
        return Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Book not found" })),
        ));
    }
    let path = body.cover_image_path.trim();
    if path.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "coverImagePath is required" })),
        ));
    }
    sqlx::query(r#"UPDATE Book SET coverImagePath = ?, updatedAt = datetime('now') WHERE id = ?"#)
        .bind(path)
        .bind(book_id)
        .execute(&state.pool)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "update failed" })),
            )
        })?;
    Ok(Json(json!({ "id": book_id, "coverImagePath": path })))
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/books/{book_id}", get(book_file))
        .route("/covers/{book_id}", get(book_cover).post(post_cover))
        .route("/ol-covers/{ol_id}", get(ol_cover))
}