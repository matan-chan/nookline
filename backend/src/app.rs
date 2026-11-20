use axum::{
    extract::State,
    http::{header, HeaderMap, HeaderValue},
    response::IntoResponse,
    routing::get,
    Router,
};
use std::sync::Arc;
use tower_http::trace::TraceLayer;

use async_graphql_axum::{GraphQLRequest, GraphQLResponse};

use crate::auth::auth_user_from_request;
use crate::state::AppState;

const fn health_text() -> &'static str {
    "ok"
}

async fn http_health() -> impl IntoResponse {
    (
        [(header::CONTENT_TYPE, HeaderValue::from_static("text/plain; charset=utf-8"))],
        health_text(),
    )
}

async fn graphql_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
    req: GraphQLRequest,
) -> GraphQLResponse {
    let auth_header = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok());
    let user = auth_user_from_request(&state.pool, &state.jwt_secret, auth_header)
        .await
        .map(Arc::new);
    let request = req
        .into_inner()
        .data(state)
        .data::<Option<Arc<crate::auth::AuthUser>>>(user);
    crate::gql::schema().execute(request).await.into()
}

pub fn build_router(state: AppState) -> Router {
    let api = Router::new()
        .route("/api/health", get(http_health))
        .route("/api/graphql", axum::routing::post(graphql_handler))
        .route("/graphql", axum::routing::post(graphql_handler))
        .nest("/api/auth", crate::routes::auth::router())
        .nest("/api/tts", crate::routes::tts::router())
        .nest("/api/files", crate::routes::files::router());

    api.with_state(state).layer(TraceLayer::new_for_http())
}