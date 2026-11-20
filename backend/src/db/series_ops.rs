use sqlx::SqlitePool;

use super::book_ops::{delete_book_children, unlink_library_books_disk_artifacts, BookArtifactRow};
use super::library::library_for_user;
use super::series::{series_for_library, SeriesRow};

pub async fn series_for_user(
    pool: &SqlitePool,
    user_id: i64,
    series_id: i64,
) -> Result<Option<SeriesRow>, sqlx::Error> {
    sqlx::query_as::<_, SeriesRow>(
        r#"SELECT Series.id, Series.libraryId, Series.title, Series.description, Series.coverImagePath, Series.metadata, Series.status,
        CASE WHEN typeof(Series.createdAt) = 'integer' THEN datetime(Series.createdAt / 1000, 'unixepoch') ELSE Series.createdAt END AS createdAt
        FROM Series
        INNER JOIN Library ON Series.libraryId = Library.id
        WHERE Series.id = ? AND Library.userId = ?"#,
    )
    .bind(series_id)
    .bind(user_id)
    .fetch_optional(pool)
    .await
}

pub struct CreateSeriesInput {
    pub library_id: i64,
    pub title: String,
    pub description: Option<String>,
    pub cover_image_path: Option<String>,
    pub metadata: Option<String>,
    pub status: Option<String>,
}

pub async fn create_series(
    pool: &SqlitePool,
    user_id: i64,
    input: CreateSeriesInput,
) -> Result<SeriesRow, sqlx::Error> {
    let lib = library_for_user(pool, user_id, input.library_id).await?;
    if lib.is_none() {
        return Err(sqlx::Error::RowNotFound);
    }
    let status = input
        .status
        .as_deref()
        .filter(|s| !s.is_empty())
        .unwrap_or("ONGOING");
    let id: i64 = sqlx::query_scalar(
        r#"INSERT INTO Series (libraryId, title, description, coverImagePath, metadata, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')) RETURNING id"#,
    )
    .bind(input.library_id)
    .bind(input.title.trim())
    .bind(input.description)
    .bind(input.cover_image_path)
    .bind(input.metadata)
    .bind(status)
    .fetch_one(pool)
    .await?;
    series_for_user(pool, user_id, id)
        .await?
        .ok_or(sqlx::Error::RowNotFound)
}

pub async fn delete_series_for_user(
    pool: &SqlitePool,
    user_id: i64,
    series_id: i64,
) -> Result<bool, sqlx::Error> {
    let Some(s) = series_for_user(pool, user_id, series_id).await? else {
        return Ok(false);
    };
    let lib_path: String = sqlx::query_scalar(r#"SELECT path FROM Library WHERE id = ?"#)
        .bind(s.library_id)
        .fetch_one(pool)
        .await?;
    let books: Vec<BookArtifactRow> =
        sqlx::query_as(r#"SELECT id, filePath, coverImagePath FROM Book WHERE seriesId = ?"#)
            .bind(series_id)
            .fetch_all(pool)
            .await?;
    unlink_library_books_disk_artifacts(&lib_path, &books);
    let book_ids: Vec<i64> = books.iter().map(|b| b.id).collect();
    let mut tx = pool.begin().await?;
    for bid in book_ids {
        delete_book_children(&mut tx, bid).await?;
    }
    sqlx::query(r#"DELETE FROM Book WHERE seriesId = ?"#)
        .bind(series_id)
        .execute(&mut *tx)
        .await?;
    sqlx::query(r#"DELETE FROM Series WHERE id = ?"#)
        .bind(series_id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(true)
}

pub async fn series_list_for_user(
    pool: &SqlitePool,
    user_id: i64,
    library_id: i64,
) -> Result<Vec<SeriesRow>, sqlx::Error> {
    let lib = library_for_user(pool, user_id, library_id).await?;
    if lib.is_none() {
        return Ok(vec![]);
    }
    series_for_library(pool, library_id).await
}
