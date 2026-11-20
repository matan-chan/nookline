mod common;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use tower::ServiceExt;

use common::TestEnv;

#[tokio::test]
async fn api_health_plain_text() {
    let env = TestEnv::new().await;
    let app = env.router();
    let res = app
        .oneshot(
            Request::builder()
                .uri("/api/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(&body[..], b"ok");
}

#[tokio::test]
async fn gql_health_and_customization() {
    let env = TestEnv::new().await;
    let data = common::gql(
        &env,
        "{ health appCustomization { siteName convertPdfToEpub } }",
        None,
        None,
    )
    .await;
    assert_eq!(data.get("health").and_then(|v| v.as_str()), Some("ok"));
    assert!(data.get("appCustomization").is_some());
}

#[tokio::test]
async fn auth_bootstrap_register_login_and_gql_me() {
    let env = TestEnv::new().await;
    let app = env.router();
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/auth/bootstrap")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let (_, token) = env.insert_user("r@test.local", "reader1").await;
    let data = common::gql(
        &env,
        "query { me { username } libraries { id } }",
        None,
        Some(&token),
    )
    .await;
    assert_eq!(
        data.get("me")
            .and_then(|m| m.get("username"))
            .and_then(|v| v.as_str()),
        Some("reader1")
    );
    assert!(data.get("libraries").and_then(|v| v.as_array()).is_some());
}
