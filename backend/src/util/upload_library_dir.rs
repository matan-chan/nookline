use std::path::PathBuf;

use sqlx::SqlitePool;

use super::paths::{resolve_library_content_dir, upload_base_dir};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum UploadLibraryDirError {
    InvalidLibraryId,
    LibraryNotFound,
    Db,
    Io(String),
}

pub async fn resolve_book_upload_directory(
    pool: &SqlitePool,
    library_id: Option<&str>,
) -> Result<PathBuf, UploadLibraryDirError> {
    let base = upload_base_dir();
    let Some(raw) = library_id.map(str::trim).filter(|s| !s.is_empty()) else {
        return Ok(base);
    };
    let Ok(id) = raw.parse::<i64>() else {
        return Err(UploadLibraryDirError::InvalidLibraryId);
    };
    if id < 1 {
        return Err(UploadLibraryDirError::InvalidLibraryId);
    }
    let path: Option<String> = sqlx::query_scalar(r#"SELECT path FROM Library WHERE id = ?"#)
        .bind(id)
        .fetch_optional(pool)
        .await
        .map_err(|_| UploadLibraryDirError::Db)?;
    let Some(lib_path) = path else {
        return Err(UploadLibraryDirError::LibraryNotFound);
    };
    let dir = resolve_library_content_dir(&base, &lib_path);
    tokio::fs::create_dir_all(&dir)
        .await
        .map_err(|e| UploadLibraryDirError::Io(e.to_string()))?;
    Ok(dir)
}
