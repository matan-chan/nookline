use sqlx::SqlitePool;

use crate::auth::hash_password;

pub async fn run_startup(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    ensure_legacy_libraries_admin(pool).await?;
    ensure_app_customization(pool).await?;
    repair_absolute_book_paths(pool).await?;
    repair_legacy_ms_datetimes(pool).await?;
    Ok(())
}

async fn repair_legacy_ms_datetimes(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    const BOTH: &[&str] = &["Book", "Library", "Series", "User", "VoiceProfile"];
    const UPDATED_ONLY: &[&str] = &["ReadingProgress", "AppCustomization"];
    const CREATED_ONLY: &[&str] = &["Bookmark", "Highlight", "BookFavorite"];
    for table in BOTH {
        sqlx::query(&format!(
            "UPDATE {table} SET createdAt = datetime(createdAt / 1000, 'unixepoch') WHERE typeof(createdAt) = 'integer'"
        ))
        .execute(pool)
        .await?;
        sqlx::query(&format!(
            "UPDATE {table} SET updatedAt = datetime(updatedAt / 1000, 'unixepoch') WHERE typeof(updatedAt) = 'integer'"
        ))
        .execute(pool)
        .await?;
    }
    for table in UPDATED_ONLY {
        sqlx::query(&format!(
            "UPDATE {table} SET updatedAt = datetime(updatedAt / 1000, 'unixepoch') WHERE typeof(updatedAt) = 'integer'"
        ))
        .execute(pool)
        .await?;
    }
    for table in CREATED_ONLY {
        sqlx::query(&format!(
            "UPDATE {table} SET createdAt = datetime(createdAt / 1000, 'unixepoch') WHERE typeof(createdAt) = 'integer'"
        ))
        .execute(pool)
        .await?;
    }
    Ok(())
}

async fn repair_absolute_book_paths(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    use crate::util::paths::normalize_stored_upload_path;
    let rows: Vec<(i64, String)> =
        sqlx::query_as(r#"SELECT id, filePath FROM Book"#)
            .fetch_all(pool)
            .await?;
    for (id, fp) in rows {
        let next = normalize_stored_upload_path(&fp);
        if next.is_empty() || next == fp {
            continue;
        }
        sqlx::query(r#"UPDATE Book SET filePath = ?, updatedAt = datetime('now') WHERE id = ?"#)
            .bind(next)
            .bind(id)
            .execute(pool)
            .await?;
    }
    let covers: Vec<(i64, String)> = sqlx::query_as(
        r#"SELECT id, coverImagePath FROM Book WHERE coverImagePath IS NOT NULL AND (coverImagePath LIKE '%:%' OR coverImagePath LIKE '\\%')"#,
    )
    .fetch_all(pool)
    .await?;
    for (id, cp) in covers {
        let next = normalize_stored_upload_path(&cp);
        if next.is_empty() || next == cp {
            continue;
        }
        sqlx::query(
            r#"UPDATE Book SET coverImagePath = ?, updatedAt = datetime('now') WHERE id = ?"#,
        )
        .bind(next)
        .bind(id)
        .execute(pool)
        .await?;
    }
    Ok(())
}

async fn ensure_legacy_libraries_admin(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    let user_count: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM User"#).fetch_one(pool).await?;
    let lib_count: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM Library"#).fetch_one(pool).await?;
    if user_count > 0 || lib_count == 0 {
        return Ok(());
    }
    let pw = std::env::var("LEGACY_ADMIN_PASSWORD")
        .unwrap_or_else(|_| "nookline".to_string())
        .trim()
        .to_string();
    let username = "admin";
    let email = "admin@nookline.app";
    let hashed = hash_password(&pw).map_err(sqlx::Error::Protocol)?;
    sqlx::query(
        r#"INSERT INTO User (email, username, password, isAdmin, ttsMode, ttsVoice, ttsModel, ttsSpeed, ttsPitch, ttsChunkMinChars, ttsChunkMaxChars, ttsChunkPeriodExtra, ttsReaderShowPage, ttsReaderShowTitle, ttsReaderStripPdfMargins, ttsReaderDarkDocument, createdAt, updatedAt) VALUES (?, ?, ?, 1, 'kokoro', 'af_heart', 'kokoro', 1.0, 1.0, 200, 300, 1500, 1, 1, 1, 0, datetime('now'), datetime('now'))"#,
    )
    .bind(email)
    .bind(username)
    .bind(hashed)
    .execute(pool)
    .await?;
    let uid: Option<i64> =
        sqlx::query_scalar(r#"SELECT id FROM User WHERE username = ?"#)
            .bind(username)
            .fetch_optional(pool)
            .await?;
    if let Some(id) = uid {
        sqlx::query(r#"UPDATE Library SET userId = ?"#)
            .bind(id)
            .execute(pool)
            .await?;
    }
    Ok(())
}

async fn ensure_app_customization(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    let n: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM AppCustomization WHERE id = 1"#)
        .fetch_one(pool)
        .await?;
    if n > 0 {
        return Ok(());
    }
    sqlx::query(
        r#"INSERT INTO AppCustomization (id, convertPdfToEpub, updatedAt) VALUES (1, 0, datetime('now'))"#,
    )
    .execute(pool)
    .await?;
    Ok(())
}