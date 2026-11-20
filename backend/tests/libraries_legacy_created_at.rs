mod common;

use common::{gql, TestEnv};

#[tokio::test]
async fn libraries_query_with_prisma_ms_created_at() {
    let env = TestEnv::new().await;
    let (uid, token) = env.insert_user("lib@test.local", "owner").await;
    sqlx::query(
        r#"INSERT INTO Library (userId, name, path, type, bannerIndex, createdAt, updatedAt) VALUES (?, 'Legacy', 'legacy', 'NOVEL', 0, 1778358778782, datetime('now'))"#,
    )
    .bind(uid)
    .execute(&env.state.pool)
    .await
    .expect("legacy lib");

    let data = gql(
        &env,
        r#"query { libraries { id name path } }"#,
        None,
        Some(&token),
    )
    .await;
    let libs = data.get("libraries").and_then(|v| v.as_array()).expect("libs");
    assert!(libs.iter().any(|l| l.get("name").and_then(|v| v.as_str()) == Some("Legacy")));
}