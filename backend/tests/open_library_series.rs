mod common;

use common::TestEnv;
use nookline_backend::db::{create_library, create_series, CreateSeriesInput};
use nookline_backend::services::open_library::resolve_series_attachment_from_work;
use serde_json::json;

#[tokio::test]
async fn series_attach_creates_once_and_reuses() {
    let env = TestEnv::new().await;
    let (uid, _) = env.insert_user("ser@test.local", "owner").await;
    let lib = create_library(&env.state.pool, uid, "L", ".", "NOVEL", 0, None)
        .await
        .expect("lib");
    let work = json!({
        "series": [{ "name": "Saga", "position": "2" }]
    });
    let a = resolve_series_attachment_from_work(
        &env.state.pool,
        lib.id,
        None,
        None,
        &json!({}),
        &work,
    )
    .await;
    let b = resolve_series_attachment_from_work(
        &env.state.pool,
        lib.id,
        None,
        None,
        &json!({}),
        &work,
    )
    .await;
    let sid = a.series_id.expect("series a");
    assert_eq!(b.series_id, Some(sid));
    assert_eq!(b.volume_number, Some(2.0));
    let count: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM Series WHERE libraryId = ? AND title = ?"#)
        .bind(lib.id)
        .bind("Saga")
        .fetch_one(&env.state.pool)
        .await
        .expect("count");
    assert_eq!(count, 1);
}

#[tokio::test]
async fn series_attach_keeps_existing_series_id() {
    let env = TestEnv::new().await;
    let (uid, _) = env.insert_user("ser2@test.local", "owner").await;
    let lib = create_library(&env.state.pool, uid, "L2", ".", "NOVEL", 0, None)
        .await
        .expect("lib");
    let existing = create_series(
        &env.state.pool,
        uid,
        CreateSeriesInput {
            library_id: lib.id,
            title: "Arc".to_string(),
            description: None,
            cover_image_path: None,
            metadata: None,
            status: Some("ONGOING".to_string()),
        },
    )
    .await
    .expect("series");
    let work = json!({ "series": [{ "name": "Other", "position": "9" }] });
    let out = resolve_series_attachment_from_work(
        &env.state.pool,
        lib.id,
        Some(existing.id),
        Some(1.0),
        &json!({}),
        &work,
    )
    .await;
    assert_eq!(out.series_id, Some(existing.id));
    assert_eq!(out.volume_number, Some(1.0));
}