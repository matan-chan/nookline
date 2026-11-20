use std::path::{Path, PathBuf};
use std::sync::Arc;

use dashmap::DashMap;
use sqlx::SqlitePool;
use tokio::sync::Mutex;
use walkdir::WalkDir;

use crate::db::{
    book_for_user, create_book_record, library_by_id, load_existing_file_path_keys, BookRow,
    CreateBookInput,
};
use crate::services::book_filename::{metadata_json_for_ext, title_from_disk_path};
use crate::util::paths::{resolve_book_file_on_disk, upload_base_dir};

const ALLOWED: &[&str] = &[".pdf", ".epub"];

static SYNC_LOCKS: std::sync::OnceLock<DashMap<i64, Arc<Mutex<()>>>> = std::sync::OnceLock::new();

fn sync_locks() -> &'static DashMap<i64, Arc<Mutex<()>>> {
    SYNC_LOCKS.get_or_init(DashMap::new)
}

pub async fn sync_library_books_from_disk(
    pool: &SqlitePool,
    library_id: i64,
) -> Result<Vec<BookRow>, String> {
    let lock = sync_locks()
        .entry(library_id)
        .or_insert_with(|| Arc::new(Mutex::new(())))
        .clone();
    let _guard = lock.lock().await;
    run_sync(pool, library_id).await
}

async fn run_sync(pool: &SqlitePool, library_id: i64) -> Result<Vec<BookRow>, String> {
    let lib = library_by_id(pool, library_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Library not found".to_string())?;
    let path_configured = lib.path.trim();
    if path_configured.is_empty() {
        return Err("Library has no path configured".to_string());
    }
    let root = resolve_scan_root(path_configured)?;
    let disk_files = collect_book_paths(&root)?;
    let mut seen = load_existing_file_path_keys(pool, library_id)
        .await
        .map_err(|e| e.to_string())?;
    let mut added = Vec::new();
    for abs in disk_files {
        let key = canonical_path_key(&abs);
        if seen.contains(&key) {
            continue;
        }
        if !is_strict_descendant(&root, &abs) {
            continue;
        }
        let title = title_from_disk_path(&abs);
        let ext = Path::new(&abs)
            .extension()
            .map(|e| format!(".{}", e.to_string_lossy()))
            .unwrap_or_default();
        let metadata = metadata_json_for_ext(&ext);
        match create_book_record(
            pool,
            CreateBookInput {
                library_id,
                series_id: None,
                open_library_series_name: None,
                title,
                file_path: abs.clone(),
                cover_image_path: None,
                volume_number: None,
                metadata,
            },
        )
        .await
        {
            Ok(row) => {
                seen.insert(key);
                added.push(row);
            }
            Err(e) => {
                if is_unique_violation(&e) {
                    continue;
                }
                return Err(e.to_string());
            }
        }
    }
    Ok(added)
}

fn is_unique_violation(e: &sqlx::Error) -> bool {
    matches!(
        e,
        sqlx::Error::Database(db)
            if db.message().contains("UNIQUE constraint failed")
    )
}

fn resolve_scan_root(configured_path: &str) -> Result<PathBuf, String> {
    let root = crate::util::paths::resolve_library_content_dir(&upload_base_dir(), configured_path);
    if !root.exists() {
        return Err(format!("Library path does not exist: {}", root.display()));
    }
    let meta = std::fs::metadata(&root).map_err(|e| e.to_string())?;
    if !meta.is_dir() {
        return Err(format!(
            "Library path is not a directory: {}",
            root.display()
        ));
    }
    std::fs::canonicalize(&root).map_err(|e| format!("Library path is not accessible: {e}"))
}

fn collect_book_paths(root: &Path) -> Result<Vec<String>, String> {
    let mut out = Vec::new();
    for ent in WalkDir::new(root)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if !ent.file_type().is_file() {
            continue;
        }
        let path = ent.path();
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .map(|e| format!(".{}", e.to_ascii_lowercase()))
            .unwrap_or_default();
        if !ALLOWED.contains(&ext.as_str()) {
            continue;
        }
        if std::fs::metadata(path).is_err() {
            continue;
        }
        out.push(path.to_string_lossy().to_string());
    }
    Ok(out)
}

fn is_strict_descendant(root: &Path, abs: &str) -> bool {
    let file = match std::fs::canonicalize(abs) {
        Ok(p) => p,
        Err(_) => PathBuf::from(abs),
    };
    let rel = match file.strip_prefix(root) {
        Ok(r) => r,
        Err(_) => return false,
    };
    !rel.as_os_str().is_empty()
}

fn canonical_path_key(p: &str) -> String {
    let path = PathBuf::from(p.trim());
    let resolved = if path.exists() {
        std::fs::canonicalize(&path).unwrap_or(path)
    } else {
        path
    };
    let s = resolved.to_string_lossy().to_string();
    if cfg!(windows) {
        s.to_lowercase()
    } else {
        s
    }
}

pub fn resolve_book_abs_for_row(library_path: &str, file_path: &str) -> PathBuf {
    resolve_book_file_on_disk(library_path, file_path)
}

pub async fn assert_book_readable(
    pool: &SqlitePool,
    user_id: i64,
    book_id: i64,
) -> Result<BookRow, String> {
    book_for_user(pool, user_id, book_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Book not found".to_string())
}
