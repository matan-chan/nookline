use axum::http::HeaderMap;
use std::sync::Arc;

use crate::auth::auth_user_from_request;
use crate::auth::AuthUser;
use crate::state::AppState;

fn bearer_from_headers(headers: &HeaderMap) -> Option<&str> {
    headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .filter(|s| !s.trim().is_empty())
}

pub fn auth_header_or_query_token(headers: &HeaderMap) -> Option<String> {
    if let Some(h) = bearer_from_headers(headers) {
        return Some(h.to_string());
    }
    None
}

pub async fn require_user(state: &AppState, headers: &HeaderMap) -> Option<Arc<AuthUser>> {
    auth_user_from_request(&state.pool, &state.jwt_secret, bearer_from_headers(headers))
        .await
        .map(Arc::new)
}

pub async fn require_user_for_cover(
    state: &AppState,
    headers: &HeaderMap,
    query_token: Option<&str>,
) -> Option<Arc<AuthUser>> {
    let auth = bearer_from_headers(headers).map(String::from).or_else(|| {
        query_token
            .map(str::trim)
            .filter(|t| !t.is_empty())
            .map(|t| format!("Bearer {t}"))
    });
    auth_user_from_request(&state.pool, &state.jwt_secret, auth.as_deref())
        .await
        .map(Arc::new)
}

pub async fn require_admin(state: &AppState, headers: &HeaderMap) -> Option<Arc<AuthUser>> {
    let u = require_user(state, headers).await?;
    if !u.is_admin {
        return None;
    }
    Some(u)
}
