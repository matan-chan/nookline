use sqlx::SqlitePool;

use super::customization::load_app_customization;
use crate::util::paths::abs_from_upload_rel;

const SITE_NAME_MAX: usize = 120;

fn normalize_site_name_for_storage(raw: &str) -> Option<String> {
    let t = raw.trim();
    if t.is_empty() {
        return None;
    }
    Some(t.chars().take(SITE_NAME_MAX).collect())
}

pub async fn update_app_site_name(pool: &SqlitePool, site_name: &str) -> Result<(), sqlx::Error> {
    let to_store = normalize_site_name_for_storage(site_name);
    sqlx::query(
        r#"INSERT INTO AppCustomization (id, siteName, convertPdfToEpub, updatedAt) VALUES (1, ?, 0, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET siteName = excluded.siteName, updatedAt = datetime('now')"#,
    )
    .bind(to_store)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn update_pdf_conversion(pool: &SqlitePool, convert: bool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"INSERT INTO AppCustomization (id, convertPdfToEpub, updatedAt) VALUES (1, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET convertPdfToEpub = excluded.convertPdfToEpub, updatedAt = datetime('now')"#,
    )
    .bind(convert)
    .execute(pool)
    .await?;
    Ok(())
}

fn unlink_upload_rel(rel: &str) {
    let t = rel.trim();
    if t.is_empty() {
        return;
    }
    let abs = abs_from_upload_rel(t);
    if abs.exists() && abs.is_file() {
        let _ = std::fs::remove_file(&abs);
    }
}

pub async fn reset_app_customization(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    let banner_paths: Vec<String> = sqlx::query_scalar(r#"SELECT relPath FROM CustomLibraryBanner"#)
        .fetch_all(pool)
        .await?;
    let favicon_before: Option<String> = sqlx::query_scalar(
        r#"SELECT faviconRelPath FROM AppCustomization WHERE id = 1"#,
    )
    .fetch_optional(pool)
    .await?;
    let mut tx = pool.begin().await?;
    sqlx::query(r#"DELETE FROM CustomLibraryBanner"#)
        .execute(&mut *tx)
        .await?;
    sqlx::query(
        r#"INSERT INTO AppCustomization (id, siteName, faviconRelPath, convertPdfToEpub, updatedAt) VALUES (1, NULL, NULL, 0, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET siteName = NULL, faviconRelPath = NULL, convertPdfToEpub = 0, updatedAt = datetime('now')"#,
    )
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;
    for rel in banner_paths {
        unlink_upload_rel(&rel);
    }
    if let Some(ref fav) = favicon_before {
        unlink_upload_rel(fav);
    }
    let _ = load_app_customization(pool).await?;
    Ok(())
}