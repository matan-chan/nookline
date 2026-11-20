#![allow(dead_code)]

use axum::body::Body;
use axum::http::{Request, StatusCode};
use axum::Router;
use http_body_util::BodyExt;
use nookline_backend::{app, startup, AppState};
use nookline_backend::auth::{create_auth_token, AUTH_TOKEN_TTL_MS};
use serde_json::{json, Value};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use tower::ServiceExt;

pub const TEST_JWT: &str = "integration-test-jwt-secret-32-bytes-min!!";

pub const INIT_SQL: &str = include_str!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../backend/prisma/migrations/20260509174920_init/migration.sql"
));

pub struct TestEnv {
    pub _dir: tempfile::TempDir,
    pub state: AppState,
}

impl TestEnv {
    pub async fn new() -> Self {
        let dir = tempfile::tempdir().expect("tempdir");
        let db = dir.path().join("test.db");
        let file_url = format!("file:{}", db.to_string_lossy().replace('\\', "/"));
        std::env::set_var("DATABASE_URL", &file_url);
        std::env::set_var("JWT_SECRET", TEST_JWT);
        let opts = SqliteConnectOptions::new()
            .filename(&db)
            .create_if_missing(true);
        let pool = SqlitePoolOptions::new()
            .max_connections(4)
            .connect_with(opts)
            .await
            .expect("sqlite");
        for stmt in INIT_SQL.split(';').filter(|s| !s.trim().is_empty()) {
            sqlx::query(stmt).execute(&pool).await.expect("migrate stmt");
        }
        startup::run_startup(&pool).await.expect("startup");
        Self {
            _dir: dir,
            state: AppState {
                pool,
                jwt_secret: TEST_JWT.to_string(),
            },
        }
    }

    pub fn router(&self) -> Router {
        app::build_router(self.state.clone())
    }

    pub async fn insert_user(&self, email: &str, username: &str) -> (i64, String) {
        sqlx::query(
            r#"INSERT INTO User (email, username, password, isAdmin, ttsMode, ttsVoice, ttsModel, ttsSpeed, ttsPitch, ttsChunkMinChars, ttsChunkMaxChars, ttsChunkPeriodExtra, ttsReaderShowPage, ttsReaderShowTitle, ttsReaderStripPdfMargins, ttsReaderDarkDocument, createdAt, updatedAt) VALUES (?, ?, '-', 0, 'kokoro', 'af_heart', 'kokoro', 1.0, 1.0, 200, 300, 1500, 1, 1, 1, 0, datetime('now'), datetime('now'))"#,
        )
        .bind(email)
        .bind(username)
        .execute(&self.state.pool)
        .await
        .expect("insert user");
        let id: i64 = sqlx::query_scalar(r#"SELECT id FROM User WHERE username = ?"#)
            .bind(username)
            .fetch_one(&self.state.pool)
            .await
            .expect("user id");
        let token = create_auth_token(id, false, AUTH_TOKEN_TTL_MS, &self.state.jwt_secret);
        (id, token)
    }
}

pub async fn post_json(
    router: Router,
    method: &str,
    uri: &str,
    body: Option<Value>,
    token: Option<&str>,
) -> (StatusCode, Value) {
    let mut req = Request::builder().method(method).uri(uri);
    if let Some(tok) = token {
        req = req.header("authorization", format!("Bearer {tok}"));
    }
    let body = match body {
        Some(v) => {
            req = req.header("content-type", "application/json");
            Body::from(v.to_string())
        }
        None => Body::empty(),
    };
    let res = router
        .oneshot(req.body(body).unwrap())
        .await
        .expect("oneshot");
    let status = res.status();
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let val: Value = if bytes.is_empty() {
        Value::Null
    } else {
        serde_json::from_slice(&bytes).unwrap_or(json!({ "raw": String::from_utf8_lossy(&bytes) }))
    };
    (status, val)
}

pub async fn gql(
    env: &TestEnv,
    query: &str,
    variables: Option<Value>,
    token: Option<&str>,
) -> Value {
    let router = env.router();
    let body = match variables {
        Some(v) => json!({ "query": query, "variables": v }),
        None => json!({ "query": query }),
    };
    let (status, val) = post_json(router, "POST", "/api/graphql", Some(body), token).await;
    assert_eq!(status, StatusCode::OK, "gql http status: {val}");
    if let Some(errs) = val.get("errors") {
        panic!("gql errors: {errs}");
    }
    val.get("data")
        .cloned()
        .expect("gql data")
}

pub fn gql_path<'a>(data: &'a Value, path: &[&str]) -> &'a Value {
    let mut cur = data;
    for key in path {
        cur = cur.get(key).unwrap_or_else(|| panic!("missing {key} in {data}"));
    }
    cur
}