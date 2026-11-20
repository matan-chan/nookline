use std::path::{Path, PathBuf};
use std::sync::Arc;

use dashmap::DashMap;
use once_cell::sync::Lazy;
use serde_json::{json, Value};
use sqlx::SqlitePool;
use tokio::sync::Mutex;

use crate::services::book_filename::{build_filename_inference, FilenameInference};
use crate::services::cover_generate::try_generate_cover_webp;
use crate::services::pdf::{
    extract_pdf_embedded_metadata, guess_pdf_title_author_from_first_page, PdfEmbeddedMeta,
    PdfPlainTextGuess,
};
use crate::util::paths::{
    normalize_stored_upload_path, resolve_book_file_on_disk, resolve_library_cover_cache_dir,
};

static FALLBACK_LOCKS: Lazy<DashMap<i64, Arc<Mutex<()>>>> = Lazy::new(DashMap::new);

pub async fn apply_local_book_fallback(pool: &SqlitePool, book_id: i64) -> Result<(), String> {
    let lock = FALLBACK_LOCKS
        .entry(book_id)
        .or_insert_with(|| Arc::new(Mutex::new(())))
        .clone();
    let _g = lock.lock().await;
    run_apply(pool, book_id).await
}

pub async fn persist_book_derived_cover_if_possible(
    pool: &SqlitePool,
    book_id: i64,
) -> Option<String> {
    let row = load_book_row(pool, book_id).await.ok()??;
    let abs = resolve_book_file_on_disk(&row.library_path, &row.file_path);
    let ext = path_ext(&abs);
    if ext != ".pdf" && ext != ".epub" {
        return None;
    }
    if !abs.exists() {
        return None;
    }
    let out = derived_cover_path(&row.library_path, book_id);
    if let Some(parent) = out.parent() {
        let _ = tokio::fs::create_dir_all(parent).await;
    }
    try_generate_cover_webp(&abs, &ext, &out).await.ok()?;
    if !out.exists() {
        return None;
    }
    let path = normalize_stored_upload_path(&out.to_string_lossy());
    sqlx::query(
        r#"UPDATE Book SET coverImagePath = ?, updatedAt = datetime('now') WHERE id = ?"#,
    )
    .bind(&path)
    .bind(book_id)
    .execute(pool)
    .await
    .ok()?;
    Some(path)
}

#[derive(sqlx::FromRow)]
#[allow(dead_code)]
struct BookLibRow {
    id: i64,
    title: String,
    file_path: String,
    cover_image_path: Option<String>,
    metadata: Option<String>,
    library_path: String,
}

async fn run_apply(pool: &SqlitePool, book_id: i64) -> Result<(), String> {
    let row = load_book_row(pool, book_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "book missing".to_string())?;
    let abs = resolve_book_file_on_disk(&row.library_path, &row.file_path);
    let ext = path_ext(&abs);
    if ext != ".pdf" && ext != ".epub" {
        return Ok(());
    }
    let meta = parse_meta(&row.metadata);
    let file_size = std::fs::metadata(&abs).ok().map(|m| m.len());
    let Some(file_size) = file_size else {
        return Ok(());
    };
    let inference = build_filename_inference(&abs.to_string_lossy(), &row.title);
    let pdf_emb = if ext == ".pdf" {
        let emb = tokio::task::spawn_blocking({
            let abs = abs.clone();
            move || extract_pdf_embedded_metadata(&abs, file_size)
        })
        .await
        .map_err(|e| e.to_string())?;
        emb
    } else {
        PdfEmbeddedMeta {
            title: None,
            author: None,
        }
    };
    let pdf_text = if ext == ".pdf" {
        tokio::task::spawn_blocking({
            let abs = abs.clone();
            move || guess_pdf_title_author_from_first_page(&abs, file_size)
        })
        .await
        .map_err(|e| e.to_string())?
    } else {
        PdfPlainTextGuess::default()
    };
    let new_cover = maybe_generate_derived_cover(&row, &meta, book_id, &abs, &ext).await;
    let next_title = pick_repaired_title(inference.repair_title, &pdf_emb, &pdf_text, &inference.inferred);
    let next_author = pick_fallback_author(&meta, &pdf_emb, &pdf_text, &inference.inferred);
    let merged = merge_local_fallback_metadata(
        &meta,
        &inference.slug,
        &inference.inferred,
        next_author.as_deref(),
        new_cover.as_deref(),
        &pdf_text,
    );
    let meta_s = serde_json::to_string(&merged).unwrap_or_else(|_| "{}".to_string());
    let cover_changed = new_cover.is_some();
    let title_changed = next_title.as_ref().is_some_and(|t| t != &row.title);
    let prev_meta = row
        .metadata
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("");
    let meta_changed = !meta_s.is_empty() && meta_s != prev_meta;
    let needs_local_fallback = meta
        .get("localFallback")
        .and_then(|v| v.get("filenameSlug"))
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .is_none();
    if !cover_changed && !title_changed && !meta_changed && !needs_local_fallback {
        return Ok(());
    }
    if title_changed {
        if let Some(t) = next_title.as_ref() {
            sqlx::query(
                r#"UPDATE Book SET title = ?, metadata = ?, coverImagePath = COALESCE(?, coverImagePath), updatedAt = datetime('now') WHERE id = ?"#,
            )
            .bind(t)
            .bind(&meta_s)
            .bind(new_cover)
            .bind(book_id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
            return Ok(());
        }
    }
    sqlx::query(
        r#"UPDATE Book SET metadata = ?, coverImagePath = COALESCE(?, coverImagePath), updatedAt = datetime('now') WHERE id = ?"#,
    )
    .bind(&meta_s)
    .bind(new_cover)
    .bind(book_id)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

async fn load_book_row(pool: &SqlitePool, book_id: i64) -> Result<Option<BookLibRow>, sqlx::Error> {
    sqlx::query_as(
        r#"SELECT b.id, b.title, b.filePath as file_path, b.coverImagePath as cover_image_path, b.metadata, l.path as library_path
        FROM Book b INNER JOIN Library l ON b.libraryId = l.id WHERE b.id = ?"#,
    )
    .bind(book_id)
    .fetch_optional(pool)
    .await
}

fn path_ext(abs: &Path) -> String {
    abs.extension()
        .and_then(|e| e.to_str())
        .map(|e| format!(".{}", e.to_ascii_lowercase()))
        .unwrap_or_default()
}

fn parse_meta(raw: &Option<String>) -> Value {
    raw.as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty() && !s.eq_ignore_ascii_case("null"))
        .and_then(|s| serde_json::from_str::<Value>(s).ok())
        .filter(|v: &Value| !v.is_null())
        .unwrap_or_else(|| json!({}))
}

fn should_generate_cover(book: &BookLibRow, _meta: &Value) -> bool {
    let stored = book
        .cover_image_path
        .as_deref()
        .unwrap_or("")
        .trim();
    stored.is_empty() || !Path::new(stored).exists()
}

async fn maybe_generate_derived_cover(
    book: &BookLibRow,
    meta: &Value,
    book_id: i64,
    abs: &Path,
    ext: &str,
) -> Option<String> {
    if !should_generate_cover(book, meta) {
        return None;
    }
    let out = derived_cover_path(&book.library_path, book_id);
    if let Some(parent) = out.parent() {
        let _ = tokio::fs::create_dir_all(parent).await;
    }
    try_generate_cover_webp(abs, ext, &out).await.ok()?;
    if out.exists() {
        Some(normalize_stored_upload_path(&out.to_string_lossy()))
    } else {
        None
    }
}

pub fn derived_cover_path(library_path: &str, book_id: i64) -> PathBuf {
    resolve_library_cover_cache_dir(library_path).join(format!("derived-cover-{book_id}.webp"))
}

fn pick_fallback_author(
    meta: &Value,
    pdf_emb: &PdfEmbeddedMeta,
    pdf_text: &PdfPlainTextGuess,
    inferred: &FilenameInference,
) -> Option<String> {
    if meta
        .get("author")
        .and_then(|v| v.as_str())
        .is_some_and(|s| !s.trim().is_empty())
    {
        return None;
    }
    pdf_emb
        .author
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(String::from)
        .or_else(|| {
            pdf_text
                .author
                .as_deref()
                .filter(|s| !s.is_empty())
                .map(String::from)
        })
        .or_else(|| inferred.suggested_author.clone())
}

fn pick_repaired_title(
    repair_title: bool,
    pdf_emb: &PdfEmbeddedMeta,
    pdf_text: &PdfPlainTextGuess,
    inferred: &FilenameInference,
) -> Option<String> {
    if !repair_title {
        return None;
    }
    pdf_emb
        .title
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(String::from)
        .or_else(|| {
            pdf_text
                .title
                .as_deref()
                .filter(|s| !s.is_empty())
                .map(String::from)
        })
        .or(inferred.suggested_title.clone())
}

fn merge_local_fallback_metadata(
    meta: &Value,
    slug: &str,
    inferred: &FilenameInference,
    next_author: Option<&str>,
    new_cover: Option<&str>,
    pdf_text: &PdfPlainTextGuess,
) -> Value {
    let prev_lf = meta
        .get("localFallback")
        .cloned()
        .unwrap_or(json!({}));
    let now = chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    let pdf_txt = match (&pdf_text.title, &pdf_text.author) {
        (None, None) => None,
        _ => Some(json!({
            "title": pdf_text.title,
            "author": pdf_text.author,
        })),
    };
    let mut out = meta.clone();
    if let Some(obj) = out.as_object_mut() {
        if let Some(a) = next_author {
            obj.insert("author".to_string(), json!(a));
        }
        let mut lf = prev_lf.as_object().cloned().unwrap_or_default();
        lf.insert("appliedAt".to_string(), json!(now));
        lf.insert("filenameSlug".to_string(), json!(slug));
        lf.insert("inferredTitle".to_string(), json!(inferred.suggested_title));
        lf.insert("inferredAuthor".to_string(), json!(inferred.suggested_author));
        if let Some(p) = pdf_txt {
            lf.insert("pdfFirstPageText".to_string(), p);
        }
        if new_cover.is_some() {
            lf.insert("coverFromFirstPage".to_string(), json!(true));
            lf.insert("coverGeneratedAt".to_string(), json!(now));
        }
        obj.insert("localFallback".to_string(), Value::Object(lf));
    }
    out
}