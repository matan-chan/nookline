use std::collections::HashSet;

use sqlx::SqlitePool;

use super::book::{book_for_user, BookRow, BOOK_SELECT, BOOK_SELECT_JOIN};
use super::library::library_for_user;
use crate::util::paths::normalize_stored_upload_path;

pub struct CreateBookInput {
    pub library_id: i64,
    pub series_id: Option<i64>,
    pub open_library_series_name: Option<String>,
    pub title: String,
    pub file_path: String,
    pub cover_image_path: Option<String>,
    pub volume_number: Option<f64>,
    pub metadata: Option<String>,
}

pub async fn load_existing_file_path_keys(
    pool: &SqlitePool,
    library_id: i64,
) -> Result<HashSet<String>, sqlx::Error> {
    let paths: Vec<String> = sqlx::query_scalar(
        r#"SELECT filePath FROM Book WHERE libraryId = ?"#,
    )
    .bind(library_id)
    .fetch_all(pool)
    .await?;
    Ok(paths
        .into_iter()
        .map(|p| canonical_path_key(&p))
        .collect())
}

fn canonical_path_key(p: &str) -> String {
    let path = std::path::PathBuf::from(p.trim());
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

pub async fn resolve_series_id_for_create(
    pool: &SqlitePool,
    library_id: i64,
    series_id: Option<i64>,
    open_library_series_name: Option<&str>,
) -> Result<Option<i64>, sqlx::Error> {
    if series_id.is_some() {
        return Ok(series_id);
    }
    let auto = open_library_series_name.map(str::trim).unwrap_or("");
    if auto.is_empty() {
        return Ok(None);
    }
    let existing: Option<i64> =
        sqlx::query_scalar(r#"SELECT id FROM Series WHERE libraryId = ? AND title = ? LIMIT 1"#)
            .bind(library_id)
            .bind(auto)
            .fetch_optional(pool)
            .await?;
    if let Some(id) = existing {
        return Ok(Some(id));
    }
    let id: i64 = sqlx::query_scalar(
        r#"INSERT INTO Series (libraryId, title, status, metadata, createdAt, updatedAt) VALUES (?, ?, 'ONGOING', ?, datetime('now'), datetime('now')) RETURNING id"#,
    )
    .bind(library_id)
    .bind(auto)
    .bind(r#"{"openLibrarySeriesAuto":true}"#)
    .fetch_one(pool)
    .await?;
    Ok(Some(id))
}

pub async fn create_book_record(pool: &SqlitePool, input: CreateBookInput) -> Result<BookRow, sqlx::Error> {
    let series_id = resolve_series_id_for_create(
        pool,
        input.library_id,
        input.series_id,
        input.open_library_series_name.as_deref(),
    )
    .await?;
    let file_path = normalize_stored_upload_path(&input.file_path);
    let id: i64 = sqlx::query_scalar(
        r#"INSERT INTO Book (libraryId, seriesId, title, filePath, coverImagePath, volumeNumber, metadata, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')) RETURNING id"#,
    )
    .bind(input.library_id)
    .bind(series_id)
    .bind(input.title.trim())
    .bind(file_path)
    .bind(input.cover_image_path)
    .bind(input.volume_number)
    .bind(input.metadata)
    .fetch_one(pool)
    .await?;
    post_create_book_pipeline(pool, id).await;
    fetch_book_row(pool, id).await
}

async fn post_create_book_pipeline(pool: &SqlitePool, book_id: i64) {
    let _ = crate::services::book::local_fallback::apply_local_book_fallback(pool, book_id).await;
    crate::services::pdf::infer_and_persist_pdf_margin_strip_regexes(pool, book_id)
        .await;
    let _ = crate::services::epub::enqueue_pdf_to_epub_for_book(pool, book_id).await;
}

async fn fetch_book_row(pool: &SqlitePool, id: i64) -> Result<BookRow, sqlx::Error> {
    let q = format!("{BOOK_SELECT} WHERE id = ?");
    sqlx::query_as::<_, BookRow>(&q).bind(id).fetch_one(pool).await
}

#[derive(sqlx::FromRow)]
pub struct BookArtifactRow {
    pub id: i64,
    #[sqlx(rename = "filePath")]
    pub file_path: String,
    #[sqlx(rename = "coverImagePath")]
    pub cover_image_path: Option<String>,
}

pub async fn load_library_books_for_artifact_cleanup(
    pool: &SqlitePool,
    library_id: i64,
) -> Result<Vec<BookArtifactRow>, sqlx::Error> {
    sqlx::query_as(
        r#"SELECT id, filePath, coverImagePath FROM Book WHERE libraryId = ?"#,
    )
    .bind(library_id)
    .fetch_all(pool)
    .await
}

pub fn unlink_library_books_disk_artifacts(lib_path: &str, rows: &[BookArtifactRow]) {
    for row in rows {
        crate::services::book::unlink_book_disk_artifacts(
            &crate::services::book::BookDiskArtifactInput {
                id: row.id,
                file_path: row.file_path.clone(),
                cover_image_path: row.cover_image_path.clone(),
                library_path: lib_path.to_string(),
            },
        );
    }
}

pub async fn delete_book_for_user(
    pool: &SqlitePool,
    user_id: i64,
    book_id: i64,
) -> Result<bool, sqlx::Error> {
    let row = book_for_user(pool, user_id, book_id).await?;
    let Some(book) = row else {
        return Ok(false);
    };
    if let Ok(Some(lib_path)) = sqlx::query_scalar::<_, String>(
        r#"SELECT path FROM Library WHERE id = ?"#,
    )
    .bind(book.library_id)
    .fetch_optional(pool)
    .await
    {
        crate::services::book::unlink_book_disk_artifacts(
            &crate::services::book::BookDiskArtifactInput {
                id: book.id,
                file_path: book.file_path.clone(),
                cover_image_path: book.cover_image_path.clone(),
                library_path: lib_path,
            },
        );
    }
    let mut tx = pool.begin().await?;
    delete_book_children(&mut tx, book_id).await?;
    sqlx::query(r#"DELETE FROM Book WHERE id = ?"#)
        .bind(book_id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(true)
}

pub async fn delete_book_children(pool: &mut sqlx::SqliteConnection, book_id: i64) -> Result<(), sqlx::Error> {
    sqlx::query(r#"DELETE FROM Bookmark WHERE bookId = ?"#)
        .bind(book_id)
        .execute(&mut *pool)
        .await?;
    sqlx::query(r#"DELETE FROM Highlight WHERE bookId = ?"#)
        .bind(book_id)
        .execute(&mut *pool)
        .await?;
    sqlx::query(r#"DELETE FROM ReadingProgress WHERE bookId = ?"#)
        .bind(book_id)
        .execute(&mut *pool)
        .await?;
    sqlx::query(r#"DELETE FROM BookFavorite WHERE bookId = ?"#)
        .bind(book_id)
        .execute(&mut *pool)
        .await?;
    Ok(())
}

pub async fn assert_library_owned(
    pool: &SqlitePool,
    user_id: i64,
    library_id: i64,
) -> Result<(), sqlx::Error> {
    let lib = library_for_user(pool, user_id, library_id).await?;
    if lib.is_none() {
        return Err(sqlx::Error::RowNotFound);
    }
    Ok(())
}

pub async fn favorite_books_for_user(
    pool: &SqlitePool,
    user_id: i64,
    limit: i64,
) -> Result<Vec<BookRow>, sqlx::Error> {
    sqlx::query_as::<_, BookRow>(&format!(
        "{BOOK_SELECT_JOIN}
        FROM Book
        INNER JOIN BookFavorite ON BookFavorite.bookId = Book.id
        INNER JOIN Library ON Book.libraryId = Library.id
        WHERE BookFavorite.userId = ? AND Library.userId = ?
        ORDER BY BookFavorite.createdAt DESC
        LIMIT ?"
    ))
    .bind(user_id)
    .bind(user_id)
    .bind(limit)
    .fetch_all(pool)
    .await
}

pub async fn recommended_books_for_user(
    pool: &SqlitePool,
    user_id: i64,
    book_id: i64,
    limit: i64,
) -> Result<Vec<BookRow>, sqlx::Error> {
    use crate::services::recommendations::{
        merge_with_fallback, pick_recommended_ids, sanitize_rec_limit, REC_POOL_LIMIT,
    };

    let cap = sanitize_rec_limit(Some(limit as i32));
    let source = book_for_user(pool, user_id, book_id).await?;
    let Some(src) = source else {
        return Ok(vec![]);
    };
    let source_meta = src
        .metadata
        .as_deref()
        .and_then(|s| serde_json::from_str::<serde_json::Value>(s).ok())
        .unwrap_or(serde_json::json!({}));

    #[derive(sqlx::FromRow)]
    struct PoolRow {
        id: i64,
        metadata: Option<String>,
        #[sqlx(rename = "libraryId")]
        library_id: i64,
    }
    let pool_rows: Vec<PoolRow> = sqlx::query_as(
        r#"SELECT Book.id, Book.metadata, Book.libraryId FROM Book
        INNER JOIN Library ON Book.libraryId = Library.id
        WHERE Library.userId = ? AND Book.id != ?
        ORDER BY Book.createdAt DESC
        LIMIT ?"#,
    )
    .bind(user_id)
    .bind(book_id)
    .bind(REC_POOL_LIMIT)
    .fetch_all(pool)
    .await?;

    let pool_meta: Vec<(i64, Option<String>)> = pool_rows
        .iter()
        .map(|r| (r.id, r.metadata.clone()))
        .collect();
    let scored = pick_recommended_ids(&source_meta, &pool_meta, book_id, cap);
    let same_lib: Vec<i64> = pool_rows
        .iter()
        .filter(|r| r.library_id == src.library_id)
        .map(|r| r.id)
        .collect();
    let all_ids: Vec<i64> = pool_rows.iter().map(|r| r.id).collect();
    let filler_pool = if same_lib.is_empty() {
        &all_ids
    } else {
        &same_lib
    };
    let mut ids = merge_with_fallback(scored, filler_pool, cap);
    if ids.len() < cap as usize {
        ids = merge_with_fallback(ids, &all_ids, cap);
    }
    if ids.is_empty() {
        return Ok(vec![]);
    }
    let mut out = Vec::new();
    for id in ids {
        if let Some(row) = book_for_user(pool, user_id, id).await? {
            out.push(row);
        }
    }
    Ok(out)
}