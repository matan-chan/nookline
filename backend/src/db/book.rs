use sqlx::FromRow;
use sqlx::SqlitePool;

#[derive(Clone, FromRow)]
pub struct BookRow {
    pub id: i64,
    #[sqlx(rename = "libraryId")]
    pub library_id: i64,
    #[sqlx(rename = "seriesId")]
    pub series_id: Option<i64>,
    pub title: String,
    #[sqlx(rename = "filePath")]
    pub file_path: String,
    #[sqlx(rename = "coverImagePath")]
    pub cover_image_path: Option<String>,
    #[sqlx(rename = "volumeNumber")]
    pub volume_number: Option<f64>,
    pub metadata: Option<String>,
    #[sqlx(rename = "createdAt")]
    pub created_at: String,
}

pub(crate) const BOOK_SELECT: &str = concat!(
    "SELECT id, libraryId, seriesId, title, filePath, coverImagePath, volumeNumber, metadata, ",
    "CASE WHEN typeof(createdAt) = 'integer' THEN datetime(createdAt / 1000, 'unixepoch') ELSE createdAt END AS createdAt ",
    "FROM Book"
);

pub(crate) const BOOK_SELECT_JOIN: &str = concat!(
    "SELECT Book.id, Book.libraryId, Book.seriesId, Book.title, Book.filePath, Book.coverImagePath, Book.volumeNumber, Book.metadata, ",
    "CASE WHEN typeof(Book.createdAt) = 'integer' THEN datetime(Book.createdAt / 1000, 'unixepoch') ELSE Book.createdAt END AS createdAt "
);

pub async fn books_for_library(
    pool: &SqlitePool,
    library_id: i64,
) -> Result<Vec<BookRow>, sqlx::Error> {
    let q = format!("{BOOK_SELECT} WHERE libraryId = ? ORDER BY createdAt DESC");
    sqlx::query_as::<_, BookRow>(&q)
        .bind(library_id)
        .fetch_all(pool)
        .await
}

pub async fn book_for_user(
    pool: &SqlitePool,
    user_id: i64,
    book_id: i64,
) -> Result<Option<BookRow>, sqlx::Error> {
    let q = format!(
        "{BOOK_SELECT} WHERE Book.id = ? AND Book.libraryId IN (SELECT id FROM Library WHERE userId = ?)"
    );
    sqlx::query_as::<_, BookRow>(&q)
        .bind(book_id)
        .bind(user_id)
        .fetch_optional(pool)
        .await
}

pub async fn recently_added_for_user(
    pool: &SqlitePool,
    user_id: i64,
    limit: i64,
) -> Result<Vec<BookRow>, sqlx::Error> {
    sqlx::query_as::<_, BookRow>(&format!(
        "{BOOK_SELECT_JOIN}
        FROM Book
        INNER JOIN Library ON Book.libraryId = Library.id
        WHERE Library.userId = ?
        ORDER BY Book.createdAt DESC
        LIMIT ?"
    ))
    .bind(user_id)
    .bind(limit)
    .fetch_all(pool)
    .await
}
