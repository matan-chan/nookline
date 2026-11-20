mod common;

use common::TestEnv;
use nookline_backend::db::{create_book_record, create_library, CreateBookInput};

#[tokio::test]
async fn create_book_and_auto_series() {
    let env = TestEnv::new().await;
    let (uid, _) = env.insert_user("cb@test.local", "owner").await;
    let lib = create_library(&env.state.pool, uid, "Test Lib", ".", "NOVEL", 0, None)
        .await
        .expect("lib");

    let file_path = env._dir.path().join("1730000000000_dummy.pdf");
    std::fs::write(&file_path, b"%PDF").expect("write");
    let row = create_book_record(
        &env.state.pool,
        CreateBookInput {
            library_id: lib.id,
            series_id: None,
            open_library_series_name: None,
            title: "My Book".to_string(),
            file_path: file_path.to_string_lossy().into(),
            cover_image_path: None,
            volume_number: None,
            metadata: Some(r#"{"fileExt":"pdf"}"#.to_string()),
        },
    )
    .await
    .expect("book");

    assert_eq!(row.title, "My Book");
    assert_eq!(row.library_id, lib.id);
    assert!(row.series_id.is_none());

    let file2 = env._dir.path().join("v1.pdf");
    std::fs::write(&file2, b"%PDF").expect("write");
    create_book_record(
        &env.state.pool,
        CreateBookInput {
            library_id: lib.id,
            series_id: None,
            open_library_series_name: Some("The Saga".to_string()),
            title: "Volume 1".to_string(),
            file_path: file2.to_string_lossy().into(),
            cover_image_path: None,
            volume_number: None,
            metadata: None,
        },
    )
    .await
    .expect("book2");

    let series_count: i64 =
        sqlx::query_scalar(r#"SELECT COUNT(*) FROM Series WHERE libraryId = ?"#)
            .bind(lib.id)
            .fetch_one(&env.state.pool)
            .await
            .unwrap();
    assert_eq!(series_count, 1);
}
