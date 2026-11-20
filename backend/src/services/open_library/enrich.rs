use serde_json::{json, Value};
use sqlx::SqlitePool;

use super::client::{fetch_json, key_json_url, ratings_url, search_by_title_url};
use crate::db::{book_for_user, series_for_user, BookRow, SeriesRow};

const OL_META_VERSION: i64 = 3;

fn parse_meta(raw: &Option<String>) -> Value {
    raw.as_deref()
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or_else(|| json!({}))
}

fn is_already_enriched(meta: &Value) -> bool {
    let Some(ol) = meta.get("openLibrary") else {
        return false;
    };
    if ol.get("fetchFailed").and_then(|v| v.as_bool()).unwrap_or(false) {
        return false;
    }
    if ol.get("enrichedAt").and_then(|v| v.as_str()).is_none() {
        return false;
    }
    ol.get("sourceVersion").and_then(|v| v.as_i64()) == Some(OL_META_VERSION)
}

fn hint_from_book_meta(meta: &Value) -> (Option<String>, Option<String>) {
    let author = meta.get("author").and_then(|v| v.as_str()).map(String::from);
    let hint = meta
        .get("openLibraryWorkKey")
        .and_then(|v| v.as_str())
        .map(String::from)
        .or_else(|| {
            meta.get("openLibrary")
                .and_then(|v| v.get("workKey"))
                .and_then(|v| v.as_str())
                .map(String::from)
        });
    (author, hint)
}

async fn edition_to_work_key(edition_key: &str) -> Option<String> {
    if !edition_key.starts_with("/books/") {
        return None;
    }
    let data = fetch_json(&key_json_url(edition_key)).await.ok()??;
    data.get("works")?
        .as_array()?
        .first()?
        .get("key")?
        .as_str()
        .filter(|k| k.starts_with("/works/"))
        .map(String::from)
}

async fn resolve_work_key(title: &str, author: Option<&str>, hint: Option<&str>) -> Option<String> {
    if let Some(h) = hint {
        if h.starts_with("/works/") {
            return Some(h.to_string());
        }
        if h.starts_with("/books/") {
            return edition_to_work_key(h).await;
        }
    }
    let url = search_by_title_url(title, author);
    let data = fetch_json(&url).await.ok()??;
    let key = data.get("docs")?.as_array()?.first()?.get("key")?.as_str()?;
    if key.starts_with("/works/") {
        return Some(key.to_string());
    }
    if key.starts_with("/books/") {
        return edition_to_work_key(key).await;
    }
    None
}

fn normalize_description(raw: &Value) -> Option<String> {
    match raw {
        Value::String(s) => {
            let t = s.trim();
            if t.is_empty() {
                None
            } else {
                Some(t.to_string())
            }
        }
        Value::Array(arr) => arr.iter().find_map(normalize_description),
        Value::Object(obj) => obj.get("value").and_then(normalize_description),
        _ => None,
    }
}

fn normalize_subjects(work: &Value) -> Vec<String> {
    work.get("subjects")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|x| x.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default()
}

async fn load_work_bundle(work_key: &str) -> Option<(Value, Value)> {
    let work = fetch_json(&key_json_url(work_key)).await.ok()??;
    if work.is_null() {
        return None;
    }
    let ratings = fetch_json(&ratings_url(work_key)).await.ok().flatten();
    let ratings_avg = ratings
        .as_ref()
        .and_then(|r| r.get("summary"))
        .and_then(|s| s.get("average"))
        .and_then(|v| v.as_f64());
    let ratings_count = ratings
        .as_ref()
        .and_then(|r| r.get("summary"))
        .and_then(|s| s.get("count"))
        .and_then(|v| v.as_i64());
    let description = normalize_description(&work["description"])
        .or_else(|| {
            work.get("excerpts")
                .and_then(|e| e.as_array())
                .and_then(|a| a.first())
                .and_then(|x| x.get("excerpt"))
                .and_then(|e| e.as_str())
                .map(|s| s.to_string())
        });
    let enrichment = json!({
        "enrichedAt": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
        "workKey": work_key,
        "description": description,
        "subjects": normalize_subjects(&work),
        "ratingsAverage": ratings_avg,
        "ratingsCount": ratings_count,
        "workTitle": work.get("title").and_then(|v| v.as_str()),
        "sourceVersion": OL_META_VERSION,
    });
    Some((enrichment, work))
}

async fn post_enrich_book_pipeline(pool: &SqlitePool, book_id: i64) {
    let _ = crate::services::book::local_fallback::apply_local_book_fallback(pool, book_id).await;
    crate::services::pdf::infer_and_persist_pdf_margin_strip_regexes(pool, book_id)
        .await;
    let _ = crate::services::epub::enqueue_pdf_to_epub_for_book(pool, book_id).await;
}

fn merge_book_meta(existing: &Value, enrichment: &Value, work_key: &str) -> Value {
    let mut base = existing.clone();
    if let Some(obj) = base.as_object_mut() {
        let prior_desc = obj
            .get("description")
            .and_then(|v| v.as_str())
            .map(String::from);
        obj.insert("openLibraryWorkKey".to_string(), json!(work_key));
        if let Some(d) = enrichment.get("description").and_then(|v| v.as_str()) {
            if !d.is_empty() {
                obj.insert("description".to_string(), json!(d));
            }
        } else if let Some(d) = prior_desc {
            obj.insert("description".to_string(), json!(d));
        }
        let prev_ol = obj.get("openLibrary").cloned().unwrap_or(json!({}));
        let mut merged = prev_ol.as_object().cloned().unwrap_or_default();
        if let Some(e) = enrichment.as_object() {
            for (k, v) in e {
                merged.insert(k.clone(), v.clone());
            }
        }
        obj.insert("openLibrary".to_string(), Value::Object(merged));
    }
    base
}

fn merge_series_meta(existing: &Value, enrichment: &Value, work_key: &str) -> Value {
    let mut base = existing.clone();
    if let Some(obj) = base.as_object_mut() {
        obj.insert("openLibraryWorkKey".to_string(), json!(work_key));
        obj.insert("openLibrary".to_string(), enrichment.clone());
    }
    base
}

fn search_failed_stub(existing: &Value) -> Value {
    let mut base = existing.clone();
    if let Some(obj) = base.as_object_mut() {
        let prev = obj.get("openLibrary").cloned().unwrap_or(json!({}));
        let mut ol = prev.as_object().cloned().unwrap_or_default();
        ol.insert(
            "enrichedAt".to_string(),
            json!(chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)),
        );
        ol.insert("fetchFailed".to_string(), json!(true));
        obj.insert("openLibrary".to_string(), Value::Object(ol));
    }
    base
}

fn load_failed_stub(existing: &Value, work_key: &str) -> Value {
    let mut base = existing.clone();
    if let Some(obj) = base.as_object_mut() {
        obj.insert(
            "openLibrary".to_string(),
            json!({
                "enrichedAt": chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
                "workKey": work_key,
                "fetchFailed": true,
            }),
        );
    }
    base
}

pub async fn enrich_book_record(
    pool: &SqlitePool,
    user_id: i64,
    book_id: i64,
) -> Result<Option<BookRow>, String> {
    let book = book_for_user(pool, user_id, book_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Book not found".to_string())?;
    let meta = parse_meta(&book.metadata);
    if is_already_enriched(&meta) {
        return Ok(Some(book));
    }
    let (author, hint) = hint_from_book_meta(&meta);
    let work_key = resolve_work_key(
        &book.title,
        author.as_deref(),
        hint.as_deref(),
    )
    .await;
    let Some(work_key) = work_key else {
        let stub = search_failed_stub(&meta);
        sqlx::query(r#"UPDATE Book SET metadata = ?, updatedAt = datetime('now') WHERE id = ?"#)
            .bind(serde_json::to_string(&stub).unwrap_or_else(|_| "{}".to_string()))
            .bind(book_id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
        post_enrich_book_pipeline(pool, book_id).await;
        return book_for_user(pool, user_id, book_id)
            .await
            .map_err(|e| e.to_string());
    };
    let Some((enrichment, work)) = load_work_bundle(&work_key).await else {
        let stub = load_failed_stub(&meta, &work_key);
        sqlx::query(r#"UPDATE Book SET metadata = ?, updatedAt = datetime('now') WHERE id = ?"#)
            .bind(serde_json::to_string(&stub).unwrap_or_else(|_| "{}".to_string()))
            .bind(book_id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
        post_enrich_book_pipeline(pool, book_id).await;
        return book_for_user(pool, user_id, book_id)
            .await
            .map_err(|e| e.to_string());
    };
    let merged = merge_book_meta(&meta, &enrichment, &work_key);
    let attach = super::resolve_series_attachment_from_work(
        pool,
        book.library_id,
        book.series_id,
        book.volume_number,
        &meta,
        &work,
    )
    .await;
    sqlx::query(
        r#"UPDATE Book SET metadata = ?, seriesId = COALESCE(?, seriesId), volumeNumber = COALESCE(?, volumeNumber), updatedAt = datetime('now') WHERE id = ?"#,
    )
    .bind(serde_json::to_string(&merged).unwrap_or_else(|_| "{}".to_string()))
    .bind(attach.series_id)
    .bind(attach.volume_number)
    .bind(book_id)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;
    post_enrich_book_pipeline(pool, book_id).await;
    book_for_user(pool, user_id, book_id)
        .await
        .map_err(|e| e.to_string())
}

pub async fn enrich_series_record(
    pool: &SqlitePool,
    user_id: i64,
    series_id: i64,
) -> Result<Option<SeriesRow>, String> {
    let series = series_for_user(pool, user_id, series_id)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Series not found".to_string())?;
    let meta = parse_meta(&series.metadata);
    if is_already_enriched(&meta) {
        return Ok(Some(series));
    }
    let hint = meta
        .get("openLibraryWorkKey")
        .and_then(|v| v.as_str())
        .map(String::from);
    let work_key = resolve_work_key(&series.title, None, hint.as_deref()).await;
    let Some(work_key) = work_key else {
        let stub = search_failed_stub(&meta);
        sqlx::query(r#"UPDATE Series SET metadata = ?, updatedAt = datetime('now') WHERE id = ?"#)
            .bind(serde_json::to_string(&stub).unwrap_or_else(|_| "{}".to_string()))
            .bind(series_id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
        return series_for_user(pool, user_id, series_id)
            .await
            .map_err(|e| e.to_string());
    };
    let Some((enrichment, _work)) = load_work_bundle(&work_key).await else {
        let stub = load_failed_stub(&meta, &work_key);
        sqlx::query(r#"UPDATE Series SET metadata = ?, updatedAt = datetime('now') WHERE id = ?"#)
            .bind(serde_json::to_string(&stub).unwrap_or_else(|_| "{}".to_string()))
            .bind(series_id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
        return series_for_user(pool, user_id, series_id)
            .await
            .map_err(|e| e.to_string());
    };
    let merged = merge_series_meta(&meta, &enrichment, &work_key);
    let desc = enrichment
        .get("description")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty());
    if series.description.as_deref().unwrap_or("").is_empty() {
        if let Some(d) = desc {
            let clip = d.chars().take(2000).collect::<String>();
            sqlx::query(
                r#"UPDATE Series SET metadata = ?, description = ?, updatedAt = datetime('now') WHERE id = ?"#,
            )
            .bind(serde_json::to_string(&merged).unwrap_or_else(|_| "{}".to_string()))
            .bind(clip)
            .bind(series_id)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
            return series_for_user(pool, user_id, series_id)
                .await
                .map_err(|e| e.to_string());
        }
    }
    sqlx::query(r#"UPDATE Series SET metadata = ?, updatedAt = datetime('now') WHERE id = ?"#)
        .bind(serde_json::to_string(&merged).unwrap_or_else(|_| "{}".to_string()))
        .bind(series_id)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    series_for_user(pool, user_id, series_id)
        .await
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{method, path_regex};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    fn restore_ol_origin(prev: Option<String>) {
        match prev {
            Some(p) => std::env::set_var("OL_ORIGIN", p),
            None => std::env::remove_var("OL_ORIGIN"),
        }
    }

    #[test]
    fn merge_book_preserves_author_and_sets_work_key() {
        let existing = json!({ "author": "A" });
        let enrichment = json!({
            "description": "Desc",
            "workKey": "/works/OL1W",
            "sourceVersion": OL_META_VERSION,
        });
        let merged = merge_book_meta(&existing, &enrichment, "/works/OL1W");
        assert_eq!(merged.get("openLibraryWorkKey").and_then(|v| v.as_str()), Some("/works/OL1W"));
        assert_eq!(merged.get("author").and_then(|v| v.as_str()), Some("A"));
        assert_eq!(
            merged
                .get("openLibrary")
                .and_then(|v| v.get("sourceVersion"))
                .and_then(|v| v.as_i64()),
            Some(OL_META_VERSION)
        );
    }

    #[test]
    fn merge_series_sets_open_library_block() {
        let merged = merge_series_meta(&json!({}), &json!({ "workKey": "/works/OL1W" }), "/works/OL1W");
        assert_eq!(
            merged.get("openLibraryWorkKey").and_then(|v| v.as_str()),
            Some("/works/OL1W")
        );
    }

    #[test]
    fn is_already_enriched_requires_version() {
        let meta = json!({
            "openLibrary": {
                "enrichedAt": "2021-01-01",
                "fetchFailed": false,
                "sourceVersion": OL_META_VERSION,
            }
        });
        assert!(is_already_enriched(&meta));
        let stale = json!({ "openLibrary": { "enrichedAt": "x", "sourceVersion": 1 } });
        assert!(!is_already_enriched(&stale));
    }

    #[tokio::test]
    async fn resolve_work_key_uses_hint_and_search() {
        let _lock = crate::services::open_library::client::OL_WIREMOCK_LOCK
            .lock()
            .await;
        let prev = std::env::var("OL_ORIGIN").ok();
        let hint = resolve_work_key("T", None, Some("/works/OL9W")).await;
        assert_eq!(hint.as_deref(), Some("/works/OL9W"));

        let server = MockServer::start().await;
        std::env::set_var("OL_ORIGIN", server.uri());
        Mock::given(method("GET"))
            .and(path_regex(r"/search\.json.*"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "docs": [{ "key": "/works/OL2W" }]
            })))
            .mount(&server)
            .await;
        let from_search = resolve_work_key("Hamlet", None, None).await;
        assert_eq!(from_search.as_deref(), Some("/works/OL2W"));
        restore_ol_origin(prev);
    }

    #[tokio::test]
    async fn load_work_bundle_skips_when_work_missing() {
        let _lock = crate::services::open_library::client::OL_WIREMOCK_LOCK
            .lock()
            .await;
        let prev = std::env::var("OL_ORIGIN").ok();
        let server = MockServer::start().await;
        std::env::set_var("OL_ORIGIN", server.uri());
        Mock::given(method("GET"))
            .and(path_regex(r"/works/OLX\.json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!(null)))
            .mount(&server)
            .await;
        assert!(load_work_bundle("/works/OLX").await.is_none());
        restore_ol_origin(prev);
    }

    #[tokio::test]
    async fn load_work_bundle_merges_work_and_ratings() {
        let _lock = crate::services::open_library::client::OL_WIREMOCK_LOCK
            .lock()
            .await;
        let prev = std::env::var("OL_ORIGIN").ok();
        let server = MockServer::start().await;
        std::env::set_var("OL_ORIGIN", server.uri());
        Mock::given(method("GET"))
            .and(path_regex(r"/works/OLZ\.json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "title": "Book",
                "description": "About",
                "subjects": ["x"],
            })))
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path_regex(r"/works/OLZ/ratings\.json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "summary": { "average": 3, "count": 2 }
            })))
            .mount(&server)
            .await;
        let (enrichment, work) = load_work_bundle("/works/OLZ").await.expect("bundle");
        assert_eq!(
            enrichment.get("workKey").and_then(|v| v.as_str()),
            Some("/works/OLZ")
        );
        assert_eq!(enrichment.get("ratingsAverage").and_then(|v| v.as_f64()), Some(3.0));
        assert_eq!(
            work.get("title").and_then(|v| v.as_str()),
            Some("Book")
        );
        let subjects = enrichment
            .get("subjects")
            .and_then(|v| v.as_array())
            .expect("subjects");
        assert_eq!(subjects.len(), 1);
        restore_ol_origin(prev);
    }
}