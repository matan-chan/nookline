mod common;

use common::TestEnv;
use nookline_backend::db::{create_book_record, create_library, CreateBookInput};
use serde_json::json;
use wiremock::matchers::{method, path_regex};
use wiremock::{Mock, MockServer, ResponseTemplate};

#[tokio::test]
async fn enrich_book_fetches_work_and_ratings() {
    let _lock = nookline_backend::services::open_library::client::OL_WIREMOCK_LOCK
        .lock()
        .await;
    let prev = std::env::var("OL_ORIGIN").ok();
    let server = MockServer::start().await;
    std::env::set_var("OL_ORIGIN", server.uri());
    Mock::given(method("GET"))
        .and(path_regex(r"/search\.json.*"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "docs": [{ "key": "/works/OLTESTW" }]
        })))
        .mount(&server)
        .await;
    Mock::given(method("GET"))
        .and(path_regex(r"/works/OLTESTW\.json"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "title": "Book",
            "description": "About",
            "subjects": ["fiction"],
        })))
        .mount(&server)
        .await;
    Mock::given(method("GET"))
        .and(path_regex(r"/works/OLTESTW/ratings\.json"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "summary": { "average": 4.0, "count": 12 }
        })))
        .mount(&server)
        .await;

    let env = TestEnv::new().await;
    let (uid, _) = env.insert_user("enr@test.local", "owner").await;
    let lib = create_library(&env.state.pool, uid, "L", ".", "NOVEL", 0, None)
        .await
        .expect("lib");
    let book = create_book_record(
        &env.state.pool,
        CreateBookInput {
            library_id: lib.id,
            series_id: None,
            open_library_series_name: None,
            title: "SearchTitle".to_string(),
            file_path: "/x.pdf".to_string(),
            cover_image_path: None,
            volume_number: None,
            metadata: None,
        },
    )
    .await
    .expect("book");
    let out = nookline_backend::services::open_library::enrich_book_record(
        &env.state.pool,
        uid,
        book.id,
    )
    .await
    .expect("enrich")
    .expect("row");
    let meta: serde_json::Value =
        serde_json::from_str(out.metadata.as_deref().unwrap_or("{}")).expect("json");
    assert_eq!(
        meta.get("openLibraryWorkKey").and_then(|v| v.as_str()),
        Some("/works/OLTESTW")
    );
    assert_eq!(
        meta.get("openLibrary")
            .and_then(|o| o.get("sourceVersion"))
            .and_then(|v| v.as_i64()),
        Some(3)
    );

    match prev {
        Some(p) => std::env::set_var("OL_ORIGIN", p),
        None => std::env::remove_var("OL_ORIGIN"),
    }
}