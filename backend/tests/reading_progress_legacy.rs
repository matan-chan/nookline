mod common;

use common::{gql, TestEnv};
use nookline_backend::db::{create_book_record, create_library, CreateBookInput};
use serde_json::json;

const DASHBOARD_PROGRESS_SNIPPET: &str = r#"
  query Dash($userId: Int!) {
  recentlyAdded(limit: 12) {
    id
    readingProgressForUser(userId: $userId) {
      percentage
      updatedAt
    }
  }
  onDeck(userId: $userId) {
    progress { percentage updatedAt }
    book { id }
  }
}
"#;

#[tokio::test]
async fn reading_progress_ms_updated_at_does_not_break_dashboard() {
    let env = TestEnv::new().await;
    let (uid, token) = env.insert_user("prog@test.local", "reader").await;
    let lib = create_library(&env.state.pool, uid, "P", "prog", "NOVEL", 0, None)
        .await
        .expect("lib");
    let book = create_book_record(
        &env.state.pool,
        CreateBookInput {
            library_id: lib.id,
            series_id: None,
            open_library_series_name: None,
            title: "Sample".to_string(),
            file_path: "sample.pdf".to_string(),
            cover_image_path: None,
            volume_number: None,
            metadata: Some(r#"{"fileExt":"pdf"}"#.to_string()),
        },
    )
    .await
    .expect("book");
    sqlx::query(
        r#"INSERT INTO ReadingProgress (userId, bookId, position, percentage, updatedAt) VALUES (?, ?, '{}', 12.5, 1795021727254)"#,
    )
    .bind(uid)
    .bind(book.id)
    .execute(&env.state.pool)
    .await
    .expect("progress");

    gql(
        &env,
        DASHBOARD_PROGRESS_SNIPPET,
        Some(json!({ "userId": uid })),
        Some(&token),
    )
    .await;
}