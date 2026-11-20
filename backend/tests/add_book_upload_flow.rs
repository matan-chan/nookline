mod common;

use std::fs;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use common::{gql, post_json, TestEnv};
use http_body_util::BodyExt;
use nookline_backend::db::{create_book_record, create_library, CreateBookInput};
use nookline_backend::util::paths::resolve_stored_upload_path;
use serde_json::json;
use tower::ServiceExt;

const MIN_PDF: &[u8] = br#"%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj
trailer<</Root 1 0 R>>
%%EOF
"#;

const BOOK_DETAIL_QUERY: &str = r#"
  query BookDetail($id: Int!, $userId: Int!) {
    book(id: $id) {
      id
      title
      coverImagePath
      fileExt
      libraryId
      seriesId
      isFavoriteForUser(userId: $userId)
      library { id name }
      series { id title }
    }
    recommendedBooksForBook(bookId: $id, limit: 10) {
      id
    }
  }
"#;

#[tokio::test]
async fn slash_library_path_book_detail_file_and_upload_preview() {
    let env = TestEnv::new().await;
    let upload_root = env._dir.path().join("uploads");
    fs::create_dir_all(&upload_root).expect("upload root");
    let prev = std::env::var("UPLOAD_DIR").ok();
    std::env::set_var("UPLOAD_DIR", upload_root.to_string_lossy().as_ref());

    let (uid, token) = env.insert_user("addflow@test.local", "reader").await;
    let lib = create_library(&env.state.pool, uid, "Test67", "/test67", "NOVEL", 0, None)
        .await
        .expect("library");

    let lib_dir = upload_root.join("test67");
    fs::create_dir_all(&lib_dir).expect("lib dir");
    let name = "1795188600028_Clean_Code.pdf";
    fs::write(lib_dir.join(name), MIN_PDF).expect("pdf");
    let stored = format!("test67/{name}");

    let resolved = resolve_stored_upload_path("/test67", &stored);
    assert!(resolved.is_file(), "resolved pdf missing: {resolved:?}");

    let row = create_book_record(
        &env.state.pool,
        CreateBookInput {
            library_id: lib.id,
            series_id: None,
            open_library_series_name: None,
            title: "Clean Code".to_string(),
            file_path: stored.clone(),
            cover_image_path: None,
            volume_number: None,
            metadata: Some(r#"{"fileExt":"pdf"}"#.to_string()),
        },
    )
    .await
    .expect("create book");

    sqlx::query(
        r#"INSERT INTO Book (libraryId, title, filePath, metadata, createdAt, updatedAt) VALUES (?, 'Legacy ms', 'test67/legacy_ms.pdf', '{}', 1795021727254, datetime('now'))"#,
    )
    .bind(lib.id)
    .execute(&env.state.pool)
    .await
    .expect("legacy ms book");

    let data = gql(
        &env,
        BOOK_DETAIL_QUERY,
        Some(json!({ "id": row.id, "userId": uid })),
        Some(&token),
    )
    .await;
    let book = data.get("book").expect("book field");
    assert!(!book.is_null(), "book detail returned null");
    assert_eq!(book.get("id").and_then(|v| v.as_i64()), Some(row.id));
    assert_eq!(book.get("fileExt").and_then(|v| v.as_str()), Some("pdf"));
    assert!(data
        .get("recommendedBooksForBook")
        .and_then(|v| v.as_array())
        .is_some());

    let router = env.router();
    let book_uri = format!("/api/files/books/{}", row.id);
    let res = router
        .clone()
        .oneshot(
            Request::builder()
                .uri(&book_uri)
                .header("authorization", format!("Bearer {token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK, "book file stream");

    let preview_uri = format!(
        "/api/files/upload-preview?libraryId={}&path={}",
        lib.id,
        urlencoding::encode(&stored)
    );
    let res = router
        .clone()
        .oneshot(
            Request::builder()
                .uri(&preview_uri)
                .header("authorization", format!("Bearer {token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let preview_ok = res.status() == StatusCode::OK;
    let preview_status = res.status();
    if std::process::Command::new("pdftoppm")
        .arg("-v")
        .output()
        .is_ok()
    {
        assert_eq!(
            preview_status,
            StatusCode::OK,
            "upload-preview needs poppler"
        );
        let bytes = res.into_body().collect().await.unwrap().to_bytes();
        assert!(!bytes.is_empty());
    } else if preview_ok {
        let bytes = res.into_body().collect().await.unwrap().to_bytes();
        assert!(!bytes.is_empty());
    } else {
        assert_ne!(
            preview_status,
            StatusCode::FORBIDDEN,
            "upload-preview must not forbid valid library-relative path"
        );
        assert_ne!(preview_status, StatusCode::NOT_FOUND);
    }

    let (_status, bootstrap) =
        post_json(router, "GET", "/api/auth/bootstrap", None, Some(&token)).await;
    assert_eq!(bootstrap.get("needsFirstUser"), Some(&json!(false)));

    if let Some(p) = prev {
        std::env::set_var("UPLOAD_DIR", p);
    } else {
        std::env::remove_var("UPLOAD_DIR");
    }
}
