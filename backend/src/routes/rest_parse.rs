use axum::http::StatusCode;
use serde_json::{json, Value};

pub fn parse_positive_id(
    raw: &str,
    label: &str,
) -> Result<i64, (StatusCode, axum::Json<Value>)> {
    let id: i64 = raw.parse().map_err(|_| {
        (
            StatusCode::BAD_REQUEST,
            axum::Json(json!({ "error": format!("Invalid {label}") })),
        )
    })?;
    if id < 1 {
        return Err((
            StatusCode::BAD_REQUEST,
            axum::Json(json!({ "error": format!("Invalid {label}") })),
        ));
    }
    Ok(id)
}

pub fn map_upload_io_error(e: std::io::Error) -> (StatusCode, axum::Json<Value>) {
    use std::io::ErrorKind;
    match e.kind() {
        ErrorKind::PermissionDenied | ErrorKind::ReadOnlyFilesystem => (
            StatusCode::INSUFFICIENT_STORAGE,
            axum::Json(json!({
                "error": "Upload storage not writable (Docker: writable mount on /books; dev: uploads/ beside cwd)."
            })),
        ),
        ErrorKind::StorageFull => (
            StatusCode::INSUFFICIENT_STORAGE,
            axum::Json(json!({ "error": "Upload storage full." })),
        ),
        _ => (
            StatusCode::INTERNAL_SERVER_ERROR,
            axum::Json(json!({ "error": "Upload failed" })),
        ),
    }
}