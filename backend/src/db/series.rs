use sqlx::FromRow;
use sqlx::SqlitePool;

#[derive(Clone, FromRow)]
pub struct SeriesRow {
    pub id: i64,
    #[sqlx(rename = "libraryId")]
    pub library_id: i64,
    pub title: String,
    pub description: Option<String>,
    #[sqlx(rename = "coverImagePath")]
    pub cover_image_path: Option<String>,
    pub metadata: Option<String>,
    pub status: String,
    #[sqlx(rename = "createdAt")]
    pub created_at: String,
}

pub async fn series_for_library(
    pool: &SqlitePool,
    library_id: i64,
) -> Result<Vec<SeriesRow>, sqlx::Error> {
    sqlx::query_as::<_, SeriesRow>(
        r#"SELECT id, libraryId, title, description, coverImagePath, metadata, status,
        CASE WHEN typeof(createdAt) = 'integer' THEN datetime(createdAt / 1000, 'unixepoch') ELSE createdAt END AS createdAt
        FROM Series WHERE libraryId = ? ORDER BY id ASC"#,
    )
    .bind(library_id)
    .fetch_all(pool)
    .await
}
