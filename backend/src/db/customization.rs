use sqlx::FromRow;
use sqlx::SqlitePool;

use super::sql_datetime::NORMALIZE_UPDATED_AT;

const DEFAULT_SITE_NAME: &str = "Nookline";

#[derive(Clone, FromRow)]
#[allow(dead_code)]
pub struct AppCustomizationRow {
    pub id: i64,
    #[sqlx(rename = "siteName")]
    pub site_name: Option<String>,
    #[sqlx(rename = "faviconRelPath")]
    pub favicon_rel_path: Option<String>,
    #[sqlx(rename = "convertPdfToEpub")]
    pub convert_pdf_to_epub: bool,
    #[sqlx(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Clone, FromRow)]
pub struct CustomBannerRow {
    pub id: i64,
}

pub struct AppCustomizationView {
    pub site_name: String,
    pub has_overrides: bool,
    pub favicon_url: Option<String>,
    pub banners: Vec<(i64, String)>,
    pub convert_pdf_to_epub: bool,
}

pub async fn load_app_customization(
    pool: &SqlitePool,
) -> Result<AppCustomizationView, sqlx::Error> {
    let row: Option<AppCustomizationRow> = sqlx::query_as(&format!(
        "SELECT id, siteName, faviconRelPath, convertPdfToEpub, {NORMALIZE_UPDATED_AT} AS updatedAt FROM AppCustomization WHERE id = 1"
    ))
    .fetch_optional(pool)
    .await?;
    let banners: Vec<CustomBannerRow> =
        sqlx::query_as(r#"SELECT id FROM CustomLibraryBanner ORDER BY id ASC"#)
            .fetch_all(pool)
            .await?;
    let site_name = row
        .as_ref()
        .and_then(|r| r.site_name.as_deref())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or(DEFAULT_SITE_NAME)
        .chars()
        .take(120)
        .collect::<String>();
    let favicon_rel = row.as_ref().and_then(|r| r.favicon_rel_path.clone());
    let favicon_url = favicon_rel.as_ref().filter(|s| !s.is_empty()).map(|_| {
        let v = row.as_ref().map(|r| r.updated_at.as_str()).unwrap_or("");
        format!("/api/files/branding/favicon?v={v}")
    });
    let has_overrides = row
        .as_ref()
        .and_then(|r| r.site_name.as_deref())
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false)
        || favicon_rel.as_ref().map(|s| !s.is_empty()).unwrap_or(false)
        || !banners.is_empty();
    let banner_urls = banners
        .into_iter()
        .map(|b| (b.id, format!("/api/files/branding/library-banner/{}", b.id)))
        .collect();
    Ok(AppCustomizationView {
        site_name,
        has_overrides,
        favicon_url,
        banners: banner_urls,
        convert_pdf_to_epub: row.as_ref().map(|r| r.convert_pdf_to_epub).unwrap_or(false),
    })
}
