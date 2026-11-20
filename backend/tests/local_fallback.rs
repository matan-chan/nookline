mod common;

use common::TestEnv;
use nookline_backend::db::{create_book_record, create_library, CreateBookInput};
use nookline_backend::services::book::local_fallback::apply_local_book_fallback;
use nookline_backend::util::paths::resolve_book_file_on_disk;

#[tokio::test]
async fn local_fallback_missing_and_relative_paths() {
    let env = TestEnv::new().await;
    let (uid, _) = env.insert_user("fb@test.local", "owner").await;
    let upload = env._dir.path().join("uploads");
    std::fs::create_dir_all(&upload).expect("mkdir");
    std::env::set_var("UPLOAD_DIR", upload.to_string_lossy().as_ref());

    assert!(
        apply_local_book_fallback(&env.state.pool, 9_999_999)
            .await
            .unwrap_err()
            .contains("book missing")
    );

    let lib = create_library(&env.state.pool, uid, "L", ".", "NOVEL", 0, None)
        .await
        .expect("lib");
    let missing = upload.join("nope.pdf");
    let book = create_book_record(
        &env.state.pool,
        CreateBookInput {
            library_id: lib.id,
            series_id: None,
            open_library_series_name: None,
            title: "T".to_string(),
            file_path: missing.to_string_lossy().into(),
            cover_image_path: None,
            volume_number: None,
            metadata: None,
        },
    )
    .await
    .expect("book");
    apply_local_book_fallback(&env.state.pool, book.id)
        .await
        .expect("missing file still ok");

    let lib_path = upload.join("shelf");
    std::fs::create_dir_all(&lib_path).expect("shelf");
    let rel_name = "inside.pdf";
    std::fs::write(lib_path.join(rel_name), b"%PDF").expect("pdf");
    let lib2 = create_library(
        &env.state.pool,
        uid,
        "Rel",
        "shelf",
        "NOVEL",
        0,
        None,
    )
    .await
    .expect("lib2");
    let rel_book = create_book_record(
        &env.state.pool,
        CreateBookInput {
            library_id: lib2.id,
            series_id: None,
            open_library_series_name: None,
            title: "Rel".to_string(),
            file_path: rel_name.to_string(),
            cover_image_path: None,
            volume_number: None,
            metadata: None,
        },
    )
    .await
    .expect("rel");
    apply_local_book_fallback(&env.state.pool, rel_book.id)
        .await
        .expect("rel fb");
    let meta: String = sqlx::query_scalar(r#"SELECT metadata FROM Book WHERE id = ?"#)
        .bind(rel_book.id)
        .fetch_one(&env.state.pool)
        .await
        .expect("meta");
    let meta: serde_json::Value = serde_json::from_str(&meta).unwrap_or_default();
    assert_eq!(
        meta.get("localFallback")
            .and_then(|v| v.get("filenameSlug"))
            .and_then(|v| v.as_str()),
        Some("inside")
    );
    let abs = resolve_book_file_on_disk("shelf", rel_name);
    assert!(abs.exists());
}