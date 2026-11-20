mod common;

use common::{post_json, TestEnv};
use serde_json::json;

#[tokio::test]
async fn anonymous_libraries_empty_and_tts_forbidden() {
    let env = TestEnv::new().await;
    let router = env.router();
    let (_, token) = env.insert_user("pub@test.local", "pubuser").await;

    let body = json!({ "query": "{ libraries { id name } }" });
    let (_, val) = post_json(router.clone(), "POST", "/api/graphql", Some(body), None).await;
    assert_eq!(
        val.get("data")
            .and_then(|d| d.get("libraries"))
            .and_then(|v| v.as_array())
            .map(|a| a.len()),
        Some(0)
    );

    let bad = json!({
        "query": "query($u: Int!) { ttsSettings(userId: $u) { mode } }",
        "variables": { "u": 99999 }
    });
    let (_, bad_val) = post_json(router, "POST", "/api/graphql", Some(bad), Some(&token)).await;
    assert!(
        bad_val
            .get("errors")
            .and_then(|e| e.as_array())
            .is_some_and(|a| !a.is_empty())
    );
}