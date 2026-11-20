mod common;

use common::TestEnv;
use nookline_backend::db::{create_book_record, create_library, create_series, CreateBookInput};
use nookline_backend::services::open_library::enrich_book_record;

#[tokio::test]
async fn enrich_book_skips_when_already_at_version() {
    let env = TestEnv::new().await;
    let (uid, _) = env.insert_user("ol@test.local", "owner").await;
    let lib = create_library(&env.state.pool, uid, "L", ".", "NOVEL", 0, None)
        .await
        .expect("lib");
    let meta = r#"{"openLibrary":{"enrichedAt":"2021-01-01","fetchFailed":false,"sourceVersion":3}}"#;
    let book = create_book_record(
        &env.state.pool,
        CreateBookInput {
            library_id: lib.id,
            series_id: None,
            open_library_series_name: None,
            title: "T".to_string(),
            file_path: "/x.pdf".to_string(),
            cover_image_path: None,
            volume_number: None,
            metadata: Some(meta.to_string()),
        },
    )
    .await
    .expect("book");
    let out = enrich_book_record(&env.state.pool, uid, book.id)
        .await
        .expect("enrich")
        .expect("row");
    assert_eq!(out.metadata.as_deref(), Some(meta));

    let series = create_series(
        &env.state.pool,
        uid,
        nookline_backend::db::CreateSeriesInput {
            library_id: lib.id,
            title: "S".to_string(),
            description: None,
            cover_image_path: None,
            metadata: Some(meta.to_string()),
            status: Some("ONGOING".to_string()),
        },
    )
    .await
    .expect("series");
    let sout = nookline_backend::services::open_library::enrich_series_record(
        &env.state.pool,
        uid,
        series.id,
    )
    .await
    .expect("enrich s")
    .expect("row");
    assert_eq!(sout.metadata.as_deref(), Some(meta));
}