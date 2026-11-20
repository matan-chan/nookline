use sqlx::FromRow;
use sqlx::SqlitePool;

#[derive(Clone, FromRow)]
pub struct LibraryRow {
    pub id: i64,
    pub name: String,
    pub path: String,
    #[sqlx(rename = "type")]
    pub library_type: String,
    #[sqlx(rename = "bannerIndex")]
    pub banner_index: i64,
    #[sqlx(rename = "customLibraryBannerId")]
    pub custom_library_banner_id: Option<i64>,
    #[sqlx(rename = "createdAt")]
    pub created_at: String,
    #[sqlx(rename = "userId")]
    pub user_id: i64,
}

const LIBRARY_SELECT: &str = concat!(
    "SELECT id, name, path, type, bannerIndex, customLibraryBannerId, ",
    "CASE WHEN typeof(createdAt) = 'integer' THEN datetime(createdAt / 1000, 'unixepoch') ELSE createdAt END AS createdAt, ",
    "userId FROM Library"
);

pub async fn library_by_id(pool: &SqlitePool, library_id: i64) -> Result<Option<LibraryRow>, sqlx::Error> {
    let q = format!("{LIBRARY_SELECT} WHERE id = ?");
    sqlx::query_as::<_, LibraryRow>(&q)
        .bind(library_id)
        .fetch_optional(pool)
        .await
}

pub async fn libraries_for_user(pool: &SqlitePool, user_id: i64) -> Result<Vec<LibraryRow>, sqlx::Error> {
    let q = format!("{LIBRARY_SELECT} WHERE userId = ? ORDER BY id ASC");
    sqlx::query_as::<_, LibraryRow>(&q)
        .bind(user_id)
        .fetch_all(pool)
        .await
}

pub async fn library_for_user(
    pool: &SqlitePool,
    user_id: i64,
    library_id: i64,
) -> Result<Option<LibraryRow>, sqlx::Error> {
    let q = format!("{LIBRARY_SELECT} WHERE id = ? AND userId = ?");
    sqlx::query_as::<_, LibraryRow>(&q)
        .bind(library_id)
        .bind(user_id)
        .fetch_optional(pool)
        .await
}

const LIBRARY_BANNER_COUNT: i64 = 10;

pub fn normalize_library_banner_index(n: Option<i32>) -> Option<i64> {
    let n = n?;
    let t = n as i64;
    Some(((t % LIBRARY_BANNER_COUNT) + LIBRARY_BANNER_COUNT) % LIBRARY_BANNER_COUNT)
}

pub fn random_library_banner_index() -> i64 {
    rand::random::<u32>() as i64 % LIBRARY_BANNER_COUNT
}

pub async fn create_library(
    pool: &SqlitePool,
    user_id: i64,
    name: &str,
    path: &str,
    library_type: &str,
    banner_index: i64,
    custom_banner_id: Option<i64>,
) -> Result<LibraryRow, sqlx::Error> {
    let id: i64 = sqlx::query_scalar(
        r#"INSERT INTO Library (userId, name, path, type, bannerIndex, customLibraryBannerId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')) RETURNING id"#,
    )
    .bind(user_id)
    .bind(name.trim())
    .bind(path.trim())
    .bind(library_type.trim())
    .bind(banner_index)
    .bind(custom_banner_id)
    .fetch_one(pool)
    .await?;
    library_for_user(pool, user_id, id)
        .await?
        .ok_or(sqlx::Error::RowNotFound)
}

#[allow(clippy::too_many_arguments)]
pub async fn update_library(
    pool: &SqlitePool,
    user_id: i64,
    library_id: i64,
    name: &str,
    path: &str,
    library_type: &str,
    banner_index: Option<i64>,
    custom_banner_id: Option<Option<i64>>,
) -> Result<Option<LibraryRow>, sqlx::Error> {
    let existing = library_for_user(pool, user_id, library_id).await?;
    if existing.is_none() {
        return Ok(None);
    }
    let banner = banner_index.unwrap_or(existing.as_ref().unwrap().banner_index);
    let custom = match custom_banner_id {
        None => existing.as_ref().unwrap().custom_library_banner_id,
        Some(v) => v,
    };
    sqlx::query(
        r#"UPDATE Library SET name = ?, path = ?, type = ?, bannerIndex = ?, customLibraryBannerId = ?, updatedAt = datetime('now') WHERE id = ? AND userId = ?"#,
    )
    .bind(name.trim())
    .bind(path.trim())
    .bind(library_type.trim())
    .bind(banner)
    .bind(custom)
    .bind(library_id)
    .bind(user_id)
    .execute(pool)
    .await?;
    library_for_user(pool, user_id, library_id).await
}

pub async fn delete_library_owned(
    pool: &SqlitePool,
    user_id: i64,
    library_id: i64,
) -> Result<bool, sqlx::Error> {
    let lib = library_for_user(pool, user_id, library_id).await?;
    let Some(lib) = lib else {
        return Ok(false);
    };
    let lib_path = lib.path.clone();
    let books =
        crate::db::book_ops::load_library_books_for_artifact_cleanup(pool, library_id).await?;
    crate::db::book_ops::unlink_library_books_disk_artifacts(&lib_path, &books);
    let book_ids: Vec<i64> = books.iter().map(|b| b.id).collect();
    let mut tx = pool.begin().await?;
    for bid in book_ids {
        crate::db::book_ops::delete_book_children(&mut tx, bid).await?;
    }
    sqlx::query(r#"DELETE FROM Book WHERE libraryId = ?"#)
        .bind(library_id)
        .execute(&mut *tx)
        .await?;
    sqlx::query(r#"DELETE FROM Series WHERE libraryId = ?"#)
        .bind(library_id)
        .execute(&mut *tx)
        .await?;
    sqlx::query(r#"DELETE FROM Library WHERE id = ? AND userId = ?"#)
        .bind(library_id)
        .bind(user_id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    crate::services::library_disk_remove::remove_library_disk_folder_if_safe(&lib_path);
    Ok(true)
}