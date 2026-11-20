mod avatar;
mod book;
mod branding;
mod stream;
mod upload;

use axum::{routing::get, Json, Router};
use serde_json::json;

use crate::state::AppState;

async fn files_health() -> Json<serde_json::Value> {
    Json(json!({ "status": "ok" }))
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/health", get(files_health))
        .merge(book::router())
        .merge(avatar::router())
        .merge(branding::router())
        .merge(upload::router())
}