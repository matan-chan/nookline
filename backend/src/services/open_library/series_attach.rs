use serde_json::Value;
use sqlx::SqlitePool;

use super::client::{books_by_isbn_url, fetch_json, key_json_url};

pub struct SeriesAttach {
    pub series_id: Option<i64>,
    pub volume_number: Option<f64>,
}

pub async fn resolve_series_attachment_from_work(
    pool: &SqlitePool,
    library_id: i64,
    book_series_id: Option<i64>,
    book_volume: Option<f64>,
    meta: &Value,
    work: &Value,
) -> SeriesAttach {
    if book_series_id.is_some() {
        return SeriesAttach {
            series_id: book_series_id,
            volume_number: book_volume,
        };
    }
    let mut sinfo = series_info_from_work_json(work).await;
    if sinfo.is_none() {
        let isbns = isbns_from_meta(meta);
        if !isbns.is_empty() {
            sinfo = resolve_series_from_isbns(&isbns).await;
        }
    }
    let Some(info) = sinfo else {
        return SeriesAttach {
            series_id: None,
            volume_number: book_volume,
        };
    };
    let series_id = find_or_create_series_by_title(pool, library_id, &info.title).await;
    SeriesAttach {
        series_id: Some(series_id),
        volume_number: book_volume.or(info.volume),
    }
}

struct SeriesInfo {
    title: String,
    volume: Option<f64>,
}

async fn series_info_from_work_json(work: &Value) -> Option<SeriesInfo> {
    let series = work.get("series")?.as_array()?;
    let first = series.first()?;
    let mut title = first
        .get("name")
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(String::from);
    if let Some(sk) = first
        .get("series")
        .and_then(|v| v.get("key"))
        .and_then(|v| v.as_str())
    {
        if let Ok(Some(doc)) = fetch_json(&key_json_url(sk)).await {
            if let Some(n) = doc.get("name").and_then(|v| v.as_str()).map(str::trim) {
                if !n.is_empty() {
                    title = Some(n.to_string());
                }
            }
        }
    }
    let title = title?;
    let vol = parse_volume(first.get("position").or_else(|| first.get("volume")));
    Some(SeriesInfo { title, volume: vol })
}

async fn resolve_series_from_isbns(isbns: &[String]) -> Option<SeriesInfo> {
    for raw in isbns.iter().take(5) {
        let isbn: String = raw.chars().filter(|c| c.is_ascii_digit() || *c == 'x' || *c == 'X').collect();
        if isbn.is_empty() {
            continue;
        }
        let Ok(Some(data)) = fetch_json(&books_by_isbn_url(&isbn)).await else {
            continue;
        };
        let row = data
            .get(format!("ISBN:{isbn}"))
            .or_else(|| data.as_object().and_then(|o| o.values().next()));
        if let Some(hit) = row.and_then(series_from_books_api_row) {
            return Some(hit);
        }
    }
    None
}

fn series_from_books_api_row(row: &Value) -> Option<SeriesInfo> {
    let list = row.get("series")?.as_array()?;
    let first = list.first()?;
    let name = first.get("name").and_then(|v| v.as_str()).map(str::trim)?;
    if name.is_empty() {
        return None;
    }
    Some(SeriesInfo {
        title: name.to_string(),
        volume: parse_volume(first.get("volume")),
    })
}

fn parse_volume(raw: Option<&Value>) -> Option<f64> {
    let raw = raw?;
    if let Some(n) = raw.as_f64() {
        return Some(n);
    }
    let s = raw.as_str().unwrap_or("");
    let cleaned: String = s.chars().filter(|c| c.is_ascii_digit() || *c == '.').collect();
    cleaned.parse().ok()
}

fn isbns_from_meta(meta: &Value) -> Vec<String> {
    let raw = meta.get("isbn");
    let mut out = Vec::new();
    match raw {
        Some(Value::Array(arr)) => {
            for x in arr {
                if let Some(s) = x.as_str() {
                    let t = s.trim();
                    if !t.is_empty() {
                        out.push(t.to_string());
                    }
                }
            }
        }
        Some(Value::String(s)) => {
            let t = s.trim();
            if !t.is_empty() {
                out.push(t.to_string());
            }
        }
        _ => {}
    }
    out
}

async fn find_or_create_series_by_title(pool: &SqlitePool, library_id: i64, title: &str) -> i64 {
    let t = title.trim();
    if let Ok(Some(id)) = sqlx::query_scalar::<_, i64>(
        r#"SELECT id FROM Series WHERE libraryId = ? AND title = ? LIMIT 1"#,
    )
    .bind(library_id)
    .bind(t)
    .fetch_optional(pool)
    .await
    {
        return id;
    }
    sqlx::query_scalar::<_, i64>(
        r#"INSERT INTO Series (libraryId, title, status, metadata, createdAt, updatedAt) VALUES (?, ?, 'ONGOING', ?, datetime('now'), datetime('now')) RETURNING id"#,
    )
    .bind(library_id)
    .bind(t)
    .bind(r#"{"openLibrarySeriesAuto":true}"#)
    .fetch_one(pool)
    .await
    .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use wiremock::matchers::{method, path_regex};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    fn work_with_series(name: &str, position: &str) -> Value {
        json!({
            "series": [{ "name": name, "position": position }]
        })
    }

    #[tokio::test]
    async fn series_info_from_embedded_json() {
        let work = work_with_series("Inner", "1");
        let info = series_info_from_work_json(&work).await;
        assert_eq!(
            info.as_ref().map(|i| i.title.as_str()),
            Some("Inner")
        );
        assert_eq!(info.and_then(|i| i.volume), Some(1.0));
    }

    #[tokio::test]
    async fn series_info_empty_series_array() {
        assert!(series_info_from_work_json(&json!({ "series": [] }))
            .await
            .is_none());
    }

    fn restore_ol_origin(prev: Option<String>) {
        match prev {
            Some(p) => std::env::set_var("OL_ORIGIN", p),
            None => std::env::remove_var("OL_ORIGIN"),
        }
    }

    #[tokio::test]
    async fn resolve_series_from_isbns_reads_books_api() {
        let _lock = crate::services::open_library::client::OL_WIREMOCK_LOCK
            .lock()
            .await;
        let prev = std::env::var("OL_ORIGIN").ok();
        let server = MockServer::start().await;
        std::env::set_var("OL_ORIGIN", server.uri());
        Mock::given(method("GET"))
            .and(path_regex(r"/api/books.*"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "ISBN:9781234567890": {
                    "series": [{ "name": "ISBN Series", "volume": "3" }]
                }
            })))
            .mount(&server)
            .await;
        let out = resolve_series_from_isbns(&["978-1234567890".to_string()]).await;
        assert_eq!(
            out.as_ref().map(|s| s.title.as_str()),
            Some("ISBN Series")
        );
        assert_eq!(out.and_then(|s| s.volume), Some(3.0));
        restore_ol_origin(prev);
    }

    #[tokio::test]
    async fn resolve_series_from_isbns_empty_fetch() {
        let _lock = crate::services::open_library::client::OL_WIREMOCK_LOCK
            .lock()
            .await;
        let prev = std::env::var("OL_ORIGIN").ok();
        let server = MockServer::start().await;
        std::env::set_var("OL_ORIGIN", server.uri());
        Mock::given(method("GET"))
            .and(path_regex(r"/api/books.*"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({})))
            .mount(&server)
            .await;
        assert!(resolve_series_from_isbns(&["9780000000000".to_string()])
            .await
            .is_none());
        restore_ol_origin(prev);
    }

    #[test]
    fn parse_volume_handles_string_digits() {
        assert_eq!(parse_volume(Some(&json!("2.5"))), Some(2.5));
        assert_eq!(parse_volume(Some(&json!(" 3 "))), Some(3.0));
    }
}