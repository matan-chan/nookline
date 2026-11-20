use sqlx::FromRow;
use sqlx::SqlitePool;

use super::sql_datetime::{
    NORMALIZE_CREATED_AT, NORMALIZE_CREATED_AT_BOOK, NORMALIZE_CREATED_AT_BOOKMARK,
    NORMALIZE_CREATED_AT_HIGHLIGHT, NORMALIZE_UPDATED_AT, NORMALIZE_UPDATED_AT_READING,
};

#[derive(Clone, FromRow)]
pub struct ReadingProgressRow {
    pub id: i64,
    #[sqlx(rename = "userId")]
    pub user_id: i64,
    #[sqlx(rename = "bookId")]
    pub book_id: i64,
    pub position: String,
    pub percentage: f64,
    #[sqlx(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Clone, FromRow)]
pub struct BookmarkRow {
    pub id: i64,
    #[sqlx(rename = "userId")]
    pub user_id: i64,
    #[sqlx(rename = "bookId")]
    pub book_id: i64,
    pub position: String,
    pub note: Option<String>,
    #[sqlx(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Clone, FromRow)]
pub struct HighlightRow {
    pub id: i64,
    #[sqlx(rename = "userId")]
    pub user_id: i64,
    #[sqlx(rename = "bookId")]
    pub book_id: i64,
    #[sqlx(rename = "startPos")]
    pub start_pos: String,
    #[sqlx(rename = "endPos")]
    pub end_pos: String,
    pub text: String,
    pub color: String,
    #[sqlx(rename = "createdAt")]
    pub created_at: String,
}

pub async fn reading_progress_for_user_book(
    pool: &SqlitePool,
    user_id: i64,
    book_id: i64,
) -> Result<Option<ReadingProgressRow>, sqlx::Error> {
    sqlx::query_as::<_, ReadingProgressRow>(&format!(
        "SELECT id, userId, bookId, position, percentage, {NORMALIZE_UPDATED_AT} AS updatedAt FROM ReadingProgress WHERE userId = ? AND bookId = ?"
    ))
    .bind(user_id)
    .bind(book_id)
    .fetch_optional(pool)
    .await
}

pub async fn upsert_reading_progress(
    pool: &SqlitePool,
    user_id: i64,
    book_id: i64,
    position: &str,
    percentage: f64,
) -> Result<ReadingProgressRow, sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO ReadingProgress (userId, bookId, position, percentage, updatedAt) VALUES (?, ?, ?, ?, datetime('now'))
        ON CONFLICT(userId, bookId) DO UPDATE SET position = excluded.position, percentage = excluded.percentage, updatedAt = datetime('now')"#,
    )
    .bind(user_id)
    .bind(book_id)
    .bind(position)
    .bind(percentage)
    .execute(pool)
    .await?;
    reading_progress_for_user_book(pool, user_id, book_id)
        .await?
        .ok_or(sqlx::Error::RowNotFound)
}

pub async fn on_deck_for_user(
    pool: &SqlitePool,
    user_id: i64,
) -> Result<Vec<(super::book::BookRow, ReadingProgressRow)>, sqlx::Error> {
    #[derive(FromRow)]
    struct Joined {
        #[sqlx(flatten)]
        progress: ReadingProgressRow,
        #[sqlx(rename = "libraryId")]
        library_id: i64,
        #[sqlx(rename = "seriesId")]
        series_id: Option<i64>,
        title: String,
        #[sqlx(rename = "filePath")]
        file_path: String,
        #[sqlx(rename = "coverImagePath")]
        cover_image_path: Option<String>,
        #[sqlx(rename = "volumeNumber")]
        volume_number: Option<f64>,
        metadata: Option<String>,
        #[sqlx(rename = "bookCreatedAt")]
        book_created_at: String,
    }
    let rows: Vec<Joined> = sqlx::query_as(&format!(
        r#"SELECT ReadingProgress.id, ReadingProgress.userId, ReadingProgress.bookId, ReadingProgress.position, ReadingProgress.percentage, {NORMALIZE_UPDATED_AT_READING} AS updatedAt,
        Book.libraryId, Book.seriesId, Book.title, Book.filePath, Book.coverImagePath, Book.volumeNumber, Book.metadata, {NORMALIZE_CREATED_AT_BOOK} as bookCreatedAt
        FROM ReadingProgress
        INNER JOIN Book ON Book.id = ReadingProgress.bookId
        INNER JOIN Library ON Library.id = Book.libraryId
        WHERE ReadingProgress.userId = ? AND Library.userId = ? AND ReadingProgress.percentage > 0 AND ReadingProgress.percentage < 100
        ORDER BY ReadingProgress.updatedAt DESC"#
    ))
    .bind(user_id)
    .bind(user_id)
    .fetch_all(pool)
    .await?;
    Ok(rows
        .into_iter()
        .map(|r| {
            let book = super::book::BookRow {
                id: r.progress.book_id,
                library_id: r.library_id,
                series_id: r.series_id,
                title: r.title,
                file_path: r.file_path,
                cover_image_path: r.cover_image_path,
                volume_number: r.volume_number,
                metadata: r.metadata,
                created_at: r.book_created_at,
            };
            (book, r.progress)
        })
        .collect())
}

pub async fn is_book_favorite(
    pool: &SqlitePool,
    user_id: i64,
    book_id: i64,
) -> Result<bool, sqlx::Error> {
    let n: i64 =
        sqlx::query_scalar(r#"SELECT COUNT(*) FROM BookFavorite WHERE userId = ? AND bookId = ?"#)
            .bind(user_id)
            .bind(book_id)
            .fetch_one(pool)
            .await?;
    Ok(n > 0)
}

pub async fn set_book_favorite(
    pool: &SqlitePool,
    user_id: i64,
    book_id: i64,
    liked: bool,
) -> Result<(), sqlx::Error> {
    if liked {
        sqlx::query(
            r#"INSERT INTO BookFavorite (userId, bookId, createdAt) VALUES (?, ?, datetime('now'))
            ON CONFLICT(userId, bookId) DO NOTHING"#,
        )
        .bind(user_id)
        .bind(book_id)
        .execute(pool)
        .await?;
    } else {
        sqlx::query(r#"DELETE FROM BookFavorite WHERE userId = ? AND bookId = ?"#)
            .bind(user_id)
            .bind(book_id)
            .execute(pool)
            .await?;
    }
    Ok(())
}

pub async fn bookmarks_for_book(
    pool: &SqlitePool,
    user_id: i64,
    book_id: i64,
) -> Result<Vec<BookmarkRow>, sqlx::Error> {
    sqlx::query_as::<_, BookmarkRow>(
        &format!(
            "SELECT id, userId, bookId, position, note, {NORMALIZE_CREATED_AT} AS createdAt FROM Bookmark WHERE userId = ? AND bookId = ?"
        ),
    )
    .bind(user_id)
    .bind(book_id)
    .fetch_all(pool)
    .await
}

pub async fn add_bookmark(
    pool: &SqlitePool,
    user_id: i64,
    book_id: i64,
    position: &str,
    note: Option<String>,
) -> Result<BookmarkRow, sqlx::Error> {
    sqlx::query_as::<_, BookmarkRow>(
        r#"INSERT INTO Bookmark (userId, bookId, position, note, createdAt) VALUES (?, ?, ?, ?, datetime('now'))
        RETURNING id, userId, bookId, position, note, createdAt"#,
    )
    .bind(user_id)
    .bind(book_id)
    .bind(position)
    .bind(note)
    .fetch_one(pool)
    .await
}

pub async fn delete_bookmark(
    pool: &SqlitePool,
    user_id: i64,
    id: i64,
) -> Result<bool, sqlx::Error> {
    let r = sqlx::query(r#"DELETE FROM Bookmark WHERE id = ? AND userId = ?"#)
        .bind(id)
        .bind(user_id)
        .execute(pool)
        .await?;
    Ok(r.rows_affected() > 0)
}

pub async fn highlights_for_book(
    pool: &SqlitePool,
    user_id: i64,
    book_id: i64,
) -> Result<Vec<HighlightRow>, sqlx::Error> {
    sqlx::query_as::<_, HighlightRow>(
        &format!(
            "SELECT id, userId, bookId, startPos, endPos, text, color, {NORMALIZE_CREATED_AT} AS createdAt FROM Highlight WHERE userId = ? AND bookId = ?"
        ),
    )
    .bind(user_id)
    .bind(book_id)
    .fetch_all(pool)
    .await
}

const DEFAULT_HIGHLIGHT_COLOR: &str = "#ba9eff";

pub async fn add_highlight(
    pool: &SqlitePool,
    user_id: i64,
    book_id: i64,
    start_pos: &str,
    end_pos: &str,
    text: &str,
    color: Option<&str>,
) -> Result<HighlightRow, sqlx::Error> {
    let color = color.unwrap_or(DEFAULT_HIGHLIGHT_COLOR);
    sqlx::query_as::<_, HighlightRow>(
        r#"INSERT INTO Highlight (userId, bookId, startPos, endPos, text, color, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        RETURNING id, userId, bookId, startPos, endPos, text, color, createdAt"#,
    )
    .bind(user_id)
    .bind(book_id)
    .bind(start_pos)
    .bind(end_pos)
    .bind(text)
    .bind(color)
    .fetch_one(pool)
    .await
}

pub async fn delete_highlight(
    pool: &SqlitePool,
    user_id: i64,
    id: i64,
) -> Result<bool, sqlx::Error> {
    let r = sqlx::query(r#"DELETE FROM Highlight WHERE id = ? AND userId = ?"#)
        .bind(id)
        .bind(user_id)
        .execute(pool)
        .await?;
    Ok(r.rows_affected() > 0)
}

#[derive(Clone, FromRow)]
pub struct UserBookmarkRow {
    pub id: i64,
    #[sqlx(rename = "bookId")]
    pub book_id: i64,
    #[sqlx(rename = "bookTitle")]
    pub book_title: String,
    pub position: String,
    pub note: Option<String>,
    #[sqlx(rename = "createdAt")]
    pub created_at: String,
}

pub async fn user_bookmarks(
    pool: &SqlitePool,
    user_id: i64,
) -> Result<Vec<UserBookmarkRow>, sqlx::Error> {
    sqlx::query_as::<_, UserBookmarkRow>(
        &format!(
            r#"SELECT Bookmark.id, Bookmark.bookId, Book.title as bookTitle, Bookmark.position, Bookmark.note, {NORMALIZE_CREATED_AT_BOOKMARK} AS createdAt
        FROM Bookmark
        INNER JOIN Book ON Book.id = Bookmark.bookId
        INNER JOIN Library ON Library.id = Book.libraryId
        WHERE Bookmark.userId = ? AND Library.userId = ?
        ORDER BY Bookmark.createdAt DESC"#
        )
    )
    .bind(user_id)
    .bind(user_id)
    .fetch_all(pool)
    .await
}

#[derive(Clone, FromRow)]
pub struct UserHighlightRow {
    pub id: i64,
    #[sqlx(rename = "bookId")]
    pub book_id: i64,
    #[sqlx(rename = "bookTitle")]
    pub book_title: String,
    #[sqlx(rename = "startPos")]
    pub start_pos: String,
    #[sqlx(rename = "endPos")]
    pub end_pos: String,
    pub text: String,
    pub color: String,
    #[sqlx(rename = "createdAt")]
    pub created_at: String,
}

pub async fn user_highlights(
    pool: &SqlitePool,
    user_id: i64,
) -> Result<Vec<UserHighlightRow>, sqlx::Error> {
    sqlx::query_as::<_, UserHighlightRow>(
        &format!(
            r#"SELECT Highlight.id, Highlight.bookId, Book.title as bookTitle, Highlight.startPos, Highlight.endPos, Highlight.text, Highlight.color, {NORMALIZE_CREATED_AT_HIGHLIGHT} AS createdAt
        FROM Highlight
        INNER JOIN Book ON Book.id = Highlight.bookId
        INNER JOIN Library ON Library.id = Book.libraryId
        WHERE Highlight.userId = ? AND Library.userId = ?
        ORDER BY Highlight.createdAt DESC"#
        )
    )
    .bind(user_id)
    .bind(user_id)
    .fetch_all(pool)
    .await
}
