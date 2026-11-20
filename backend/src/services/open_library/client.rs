const OL_ORIGIN: &str = "https://openlibrary.org";

pub static OL_WIREMOCK_LOCK: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

pub const OL_SEARCH_FIELDS_WORK_KEY: &str = "key,title";

fn ol_origin() -> String {
    std::env::var("OL_ORIGIN").unwrap_or_else(|_| OL_ORIGIN.to_string())
}

pub async fn fetch_json(url: &str) -> Result<Option<serde_json::Value>, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;
    let res = client.get(url).send().await.map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Ok(None);
    }
    res.json().await.map(Some).map_err(|e| e.to_string())
}

pub fn search_by_title_url(title: &str, author: Option<&str>) -> String {
    let mut url = format!(
        "{}/search.json?title={}&limit=1&fields={OL_SEARCH_FIELDS_WORK_KEY}",
        ol_origin(),
        urlencoding::encode(title.trim())
    );
    if let Some(a) = author.map(str::trim).filter(|s| !s.is_empty()) {
        url.push_str("&author=");
        url.push_str(&urlencoding::encode(a));
    }
    url
}

pub fn key_json_url(key: &str) -> String {
    format!("{}{key}.json", ol_origin())
}

pub fn ratings_url(work_key: &str) -> String {
    format!("{}{work_key}/ratings.json", ol_origin())
}

pub fn books_by_isbn_url(isbn: &str) -> String {
    format!(
        "{}/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data",
        ol_origin()
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn search_by_title_url_fields_and_author() {
        let u = search_by_title_url("Hamlet", None);
        assert!(u.contains("title=Hamlet"));
        assert!(u.contains("limit=1"));
        assert!(u.contains("fields=key,title"));
        assert!(!u.contains("author="));
        let with_author = search_by_title_url("Hamlet", Some("Shakespeare"));
        assert!(with_author.contains("author="));
        assert!(with_author.contains("Shakespeare"));
    }

    #[test]
    fn key_and_ratings_urls() {
        assert_eq!(
            key_json_url("/works/OL1W"),
            "https://openlibrary.org/works/OL1W.json"
        );
        assert_eq!(
            ratings_url("/works/OL1W"),
            "https://openlibrary.org/works/OL1W/ratings.json"
        );
    }

    #[test]
    fn books_by_isbn_contains_bibkey() {
        assert!(books_by_isbn_url("9780").contains("bibkeys=ISBN:9780"));
    }

    #[test]
    fn ol_search_fields_constant() {
        assert_eq!(OL_SEARCH_FIELDS_WORK_KEY, "key,title");
    }
}