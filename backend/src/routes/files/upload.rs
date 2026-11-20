use std::path::{Path, PathBuf};

use axum::{
    extract::{DefaultBodyLimit, Multipart, Query, State},
    http::HeaderMap,
    response::Response,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::routes::files::stream::stream_bytes;
use crate::routes::files_auth::{require_user, require_user_for_cover};
use crate::routes::rest_parse::map_upload_io_error;
use crate::services::cover_generate::try_generate_cover_webp;
use crate::services::cover_serve::{
    cover_bytes_mime, parse_cover_width, serve_optimized_local_cover, CoverServeError,
};
use crate::services::book_filename::title_from_disk_path;
use crate::services::pdf::{extract_pdf_embedded_metadata, guess_pdf_title_author_from_first_page};
use crate::state::AppState;
use crate::util::paths::{
    cover_cache_dir, normalize_stored_upload_path, resolve_library_content_dir,
    resolve_stored_upload_path, upload_base_dir,
};

const MAX_UPLOAD_BYTES: usize = 500 * 1024 * 1024;
const PDF_EMBEDDED_META_SYNC_MAX_BYTES: u64 = 6 * 1024 * 1024;

#[derive(Deserialize)]
pub struct UploadQuery {
    #[serde(rename = "libraryId")]
    pub library_id: Option<String>,
}

#[derive(Deserialize)]
pub struct UploadPreviewQuery {
    pub token: Option<String>,
    #[serde(rename = "libraryId")]
    pub library_id: Option<String>,
    pub path: Option<String>,
    pub w: Option<String>,
    pub width: Option<String>,
}

fn map_upload_dir_err(
    err: crate::util::upload_library_dir::UploadLibraryDirError,
) -> (axum::http::StatusCode, Json<Value>) {
    use crate::util::upload_library_dir::UploadLibraryDirError;
    match err {
        UploadLibraryDirError::InvalidLibraryId => (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Invalid libraryId" })),
        ),
        UploadLibraryDirError::LibraryNotFound => (
            axum::http::StatusCode::NOT_FOUND,
            Json(json!({ "error": "Library not found" })),
        ),
        UploadLibraryDirError::Db => (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "db error" })),
        ),
        UploadLibraryDirError::Io(e) => map_upload_io_error(std::io::Error::other(e)),
    }
}

async fn resolve_upload_dest(
    state: &AppState,
    library_id: Option<&str>,
) -> Result<PathBuf, (axum::http::StatusCode, Json<Value>)> {
    crate::util::upload_library_dir::resolve_book_upload_directory(&state.pool, library_id)
        .await
        .map_err(map_upload_dir_err)
}

async fn pdf_embedded_fields_for_upload(
    path: &Path,
    size: u64,
) -> (Option<String>, Option<String>) {
    if size <= PDF_EMBEDDED_META_SYNC_MAX_BYTES {
        let p = path.to_path_buf();
        return tokio::task::spawn_blocking(move || {
            let meta = extract_pdf_embedded_metadata(&p, size);
            let mut title = meta.title;
            let mut author = meta.author;
            if title.is_none() || author.is_none() {
                let guess = guess_pdf_title_author_from_first_page(&p, size);
                title = title.or(guess.title);
                author = author.or(guess.author);
            }
            if title.is_none() {
                let from_name = title_from_disk_path(&p.to_string_lossy());
                if !from_name.trim().is_empty() {
                    title = Some(from_name);
                }
            }
            (title, author)
        })
        .await
        .unwrap_or((None, None));
    }
    let p = path.to_path_buf();
    tokio::spawn(async move {
        let _ = tokio::task::spawn_blocking(move || {
            extract_pdf_embedded_metadata(&p, size);
        })
        .await;
    });
    (None, None)
}

fn sanitize_upload_name(original: &str) -> String {
    let safe: String = original
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect();
    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    format!("{ts}_{safe}")
}

async fn post_upload(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(q): Query<UploadQuery>,
    mut multipart: Multipart,
) -> Result<Json<Value>, (axum::http::StatusCode, Json<Value>)> {
    if require_user(&state, &headers).await.is_none() {
        return Err((
            axum::http::StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "Unauthenticated" })),
        ));
    }
    let dest = resolve_upload_dest(&state, q.library_id.as_deref()).await?;
    let mut original = None;
    let mut data = None;
    while let Some(field) = multipart.next_field().await.map_err(|e| {
        (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({ "error": e.to_string() })),
        )
    })? {
        if field.name() == Some("file") {
            original = field.file_name().map(String::from);
            data = Some(field.bytes().await.map_err(|e| {
                (
                    axum::http::StatusCode::BAD_REQUEST,
                    Json(json!({ "error": e.to_string() })),
                )
            })?);
        }
    }
    let Some(bytes) = data else {
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({ "error": "No file received" })),
        ));
    };
    if bytes.len() > MAX_UPLOAD_BYTES {
        return Err((
            axum::http::StatusCode::PAYLOAD_TOO_LARGE,
            Json(json!({ "error": "File too large" })),
        ));
    }
    let orig = original.unwrap_or_else(|| "upload.bin".to_string());
    let ext = Path::new(&orig)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| format!(".{}", e.to_ascii_lowercase()))
        .unwrap_or_default();
    if ext != ".epub" && ext != ".pdf" {
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Only .epub and .pdf files are allowed" })),
        ));
    }
    let final_abs = dest.join(sanitize_upload_name(&orig));
    tokio::fs::write(&final_abs, &bytes)
        .await
        .map_err(map_upload_io_error)?;
    let size = bytes.len() as u64;
    let stored_path = normalize_stored_upload_path(&final_abs.to_string_lossy());
    let mut body = json!({
        "path": stored_path,
        "filename": orig,
        "size": size,
    });
    if ext == ".pdf" {
        let (embedded_title, embedded_author) =
            pdf_embedded_fields_for_upload(&final_abs, size).await;
        if let Some(obj) = body.as_object_mut() {
            obj.insert("embeddedTitle".to_string(), json!(embedded_title));
            obj.insert("embeddedAuthor".to_string(), json!(embedded_author));
            obj.insert(
                "suggestedTitle".to_string(),
                json!(title_from_disk_path(&stored_path)),
            );
        }
    }
    Ok(Json(body))
}

fn path_within_library(abs: &Path, allowed_root: &Path) -> bool {
    let a = abs.canonicalize().unwrap_or_else(|_| abs.to_path_buf());
    let b = allowed_root
        .canonicalize()
        .unwrap_or_else(|_| allowed_root.to_path_buf());
    a.starts_with(&b)
}

async fn upload_preview(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(q): Query<UploadPreviewQuery>,
) -> Result<Response, (axum::http::StatusCode, Json<Value>)> {
    let user = require_user_for_cover(&state, &headers, q.token.as_deref())
        .await
        .ok_or((
            axum::http::StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "Unauthenticated" })),
        ))?;
    let lib_raw = q.library_id.as_deref().unwrap_or("").trim();
    let lib_id: i64 = lib_raw.parse().map_err(|_| {
        (
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Invalid libraryId" })),
        )
    })?;
    if lib_id < 1 {
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Invalid libraryId" })),
        ));
    }
    let lib_path: Option<String> = sqlx::query_scalar(
        r#"SELECT path FROM Library WHERE id = ? AND userId = ?"#,
    )
    .bind(lib_id)
    .bind(user.id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|_| {
        (
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "db error" })),
        )
    })?;
    let Some(lib_path) = lib_path else {
        return Err((
            axum::http::StatusCode::NOT_FOUND,
            Json(json!({ "error": "Library not found" })),
        ));
    };
    let abs_str = q.path.as_deref().unwrap_or("").trim();
    if abs_str.is_empty() {
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            Json(json!({ "error": "path is required" })),
        ));
    }
    let allowed = resolve_library_content_dir(&upload_base_dir(), &lib_path);
    let abs = resolve_stored_upload_path(&lib_path, abs_str);
    if !path_within_library(&abs, &allowed) {
        return Err((
            axum::http::StatusCode::FORBIDDEN,
            Json(json!({ "error": "Forbidden" })),
        ));
    }
    let meta = tokio::fs::metadata(&abs).await.map_err(|_| {
        (
            axum::http::StatusCode::NOT_FOUND,
            Json(json!({ "error": "File not found" })),
        )
    })?;
    let ext = abs
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| format!(".{}", e.to_ascii_lowercase()))
        .unwrap_or_default();
    if ext != ".pdf" && ext != ".epub" {
        return Err((
            axum::http::StatusCode::UNSUPPORTED_MEDIA_TYPE,
            Json(json!({ "error": "Unsupported format" })),
        ));
    }
    let mtime = meta
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let digest = {
        use sha2::{Digest, Sha256};
        let h = Sha256::digest(format!("{}:{mtime}", abs.display()));
        format!("{:x}", h)[..16].to_string()
    };
    let cache_dir = cover_cache_dir();
    tokio::fs::create_dir_all(&cache_dir).await.ok();
    let master = cache_dir.join(format!("upload-preview-{digest}-src.webp"));
    if !master.exists() {
        try_generate_cover_webp(&abs, &ext, &master)
            .await
            .map_err(|_| {
                (
                    axum::http::StatusCode::BAD_GATEWAY,
                    Json(json!({ "error": "Failed to generate preview" })),
                )
            })?;
    }
    let width = parse_cover_width(q.w.as_deref(), q.width.as_deref());
    let bytes = serve_optimized_local_cover(&master, &format!("upload-preview-{digest}"), width)
        .await
        .map_err(|e| match e {
            CoverServeError::Unsupported => (
                axum::http::StatusCode::UNSUPPORTED_MEDIA_TYPE,
                Json(json!({ "error": "Unsupported cover format" })),
            ),
            _ => (
                axum::http::StatusCode::BAD_GATEWAY,
                Json(json!({ "error": "Could not optimize cover" })),
            ),
        })?;
    let mime = cover_bytes_mime(&bytes, &master);
    Ok(stream_bytes(bytes, mime, "private, max-age=300").await)
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/upload", post(post_upload))
        .route("/upload-preview", get(upload_preview))
        .layer(DefaultBodyLimit::max(MAX_UPLOAD_BYTES))
}