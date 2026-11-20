use std::path::{Path, PathBuf};
use std::process::Command;

use dashmap::DashMap;
use once_cell::sync::Lazy;
use serde_json::{json, Value};
use sqlx::SqlitePool;

static EPUB_QUEUE: Lazy<DashMap<i64, ()>> = Lazy::new(DashMap::new);

pub async fn enqueue_pdf_to_epub_for_book(pool: &SqlitePool, book_id: i64) -> bool {
    if !is_pdf_to_epub_enabled(pool).await {
        return false;
    }
    if EPUB_QUEUE.contains_key(&book_id) {
        return false;
    }
    EPUB_QUEUE.insert(book_id, ());
    let pool = pool.clone();
    tokio::spawn(async move {
        let _ = run_job(&pool, book_id).await;
        EPUB_QUEUE.remove(&book_id);
    });
    true
}

async fn is_pdf_to_epub_enabled(pool: &SqlitePool) -> bool {
    sqlx::query_scalar::<_, bool>(
        r#"SELECT convertPdfToEpub FROM AppCustomization WHERE id = 1"#,
    )
    .fetch_optional(pool)
    .await
    .ok()
    .flatten()
    .unwrap_or(false)
}

async fn run_job(pool: &SqlitePool, book_id: i64) -> Result<(), String> {
    #[derive(sqlx::FromRow)]
    struct Row {
        id: i64,
        library_id: i64,
        file_path: String,
        metadata: Option<String>,
    }
    let row: Option<Row> = sqlx::query_as(
        r#"SELECT id, libraryId as library_id, filePath as file_path, metadata FROM Book WHERE id = ?"#,
    )
    .bind(book_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;
    let Some(row) = row else {
        return Ok(());
    };
    let meta = parse_meta(&row.metadata);
    let ext = meta
        .get("fileExt")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| format!(".{}", s.to_ascii_lowercase()))
        .unwrap_or_else(|| {
            Path::new(&row.file_path)
                .extension()
                .map(|e| format!(".{}", e.to_string_lossy()))
                .unwrap_or_default()
        });
    if ext != ".pdf" {
        return Ok(());
    }
    let pdf = PathBuf::from(&row.file_path);
    if !pdf.exists() {
        return Ok(());
    }
    let epub = output_epub_path_for_pdf(&pdf);
    if !is_nonempty_file(&epub) {
        tokio::task::spawn_blocking({
            let pdf = pdf.clone();
            let epub = epub.clone();
            move || convert_pdf_to_epub(&pdf, &epub)
        })
        .await
        .map_err(|e| e.to_string())??;
    }
    try_update_book_to_epub(pool, row.id, row.library_id, &pdf, &epub, &meta).await
}

fn parse_meta(raw: &Option<String>) -> Value {
    raw.as_deref()
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or_else(|| json!({}))
}

fn output_epub_path_for_pdf(pdf: &Path) -> PathBuf {
    let Some(_ext) = pdf.extension().and_then(|e| e.to_str()) else {
        return pdf.with_extension("epub");
    };
    let base = pdf.with_extension("");
    let candidate = base.with_extension("epub");
    if !candidate.exists() {
        return candidate;
    }
    let dir = pdf.parent().unwrap_or_else(|| Path::new("."));
    let stem = pdf.file_stem().and_then(|s| s.to_str()).unwrap_or("book");
    dir.join(format!("{stem}.converted.epub"))
}

fn is_nonempty_file(p: &Path) -> bool {
    std::fs::metadata(p)
        .ok()
        .is_some_and(|m| m.is_file() && m.len() > 0)
}

fn resolve_ebook_convert_cmd() -> String {
    if let Ok(env) = std::env::var("CALIBRE_EBOOK_CONVERT") {
        let t = env.trim();
        if !t.is_empty() && Path::new(t).exists() {
            return t.to_string();
        }
    }
    if cfg!(windows) {
        for var in ["PROGRAMFILES", "PROGRAMFILES(X86)"] {
            if let Ok(root) = std::env::var(var) {
                let p = PathBuf::from(&root).join("Calibre2").join("ebook-convert.exe");
                if p.exists() {
                    return p.to_string_lossy().to_string();
                }
            }
        }
        if let Ok(la) = std::env::var("LOCALAPPDATA") {
            let p = PathBuf::from(la)
                .join("Programs")
                .join("Calibre")
                .join("ebook-convert.exe");
            if p.exists() {
                return p.to_string_lossy().to_string();
            }
        }
    }
    "ebook-convert".to_string()
}

fn convert_pdf_to_epub(input: &Path, output: &Path) -> Result<(), String> {
    if let Some(parent) = output.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let cmd = resolve_ebook_convert_cmd();
    let status = Command::new(&cmd)
        .args([input.to_string_lossy().as_ref(), output.to_string_lossy().as_ref()])
        .status()
        .map_err(|e| format!("ebook-convert not available ({cmd}): {e}"))?;
    if !status.success() {
        return Err(format!("ebook-convert failed (code {:?})", status.code()));
    }
    Ok(())
}

async fn try_update_book_to_epub(
    pool: &SqlitePool,
    book_id: i64,
    library_id: i64,
    pdf: &Path,
    epub: &Path,
    meta: &Value,
) -> Result<(), String> {
    if !is_nonempty_file(epub) {
        return Ok(());
    }
    let epub_s = epub.to_string_lossy().to_string();
    let taken: Option<i64> = sqlx::query_scalar(
        r#"SELECT id FROM Book WHERE libraryId = ? AND filePath = ? AND id != ? LIMIT 1"#,
    )
    .bind(library_id)
    .bind(&epub_s)
    .bind(book_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;
    if taken.is_some() {
        return Ok(());
    }
    let mut next = meta.clone();
    if let Some(obj) = next.as_object_mut() {
        obj.insert("fileExt".to_string(), json!("epub"));
        obj.insert(
            "convertedFromPdfPath".to_string(),
            json!(pdf.to_string_lossy()),
        );
    }
    sqlx::query(
        r#"UPDATE Book SET filePath = ?, metadata = ?, updatedAt = datetime('now') WHERE id = ?"#,
    )
    .bind(&epub_s)
    .bind(serde_json::to_string(&next).unwrap_or_else(|_| "{}".to_string()))
    .bind(book_id)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;
    if pdf != epub && pdf.extension().and_then(|e| e.to_str()).unwrap_or("").eq_ignore_ascii_case("pdf") {
        let _ = tokio::fs::remove_file(pdf).await;
    }
    Ok(())
}