use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    routing::{delete, get, post},
    Json, Router,
};
use serde::Deserialize;
use serde_json::{json, Value};
use sqlx::FromRow;

use crate::auth::{
    auth_user_from_request, create_auth_token, email_for_username, hash_password, is_valid_username,
    normalize_username, validate_password_strength, verify_password_scrypt, AUTH_TOKEN_TTL_MS,
};
use crate::state::AppState;

#[derive(FromRow)]
struct UserAuthRow {
    id: i64,
    username: String,
    password: String,
    #[sqlx(rename = "isAdmin")]
    is_admin: bool,
    #[sqlx(rename = "avatarRelPath")]
    avatar_rel_path: Option<String>,
}

fn public_user(u: &UserAuthRow) -> Value {
    json!({
        "id": u.id,
        "username": u.username,
        "isAdmin": u.is_admin,
        "hasAvatar": u.avatar_rel_path.is_some(),
    })
}

fn auth_user_json(u: &UserAuthRow, token: &str) -> Value {
    let mut base = public_user(u);
    if let Some(obj) = base.as_object_mut() {
        obj.insert("token".to_string(), json!(token));
    }
    base
}

async fn verify_password_with_legacy(
    pool: &sqlx::SqlitePool,
    user_id: i64,
    plain: &str,
    stored: &str,
) -> bool {
    if verify_password_scrypt(plain, stored) {
        return true;
    }
    if !stored.starts_with("scrypt:") && stored == plain {
        if let Ok(h) = hash_password(plain) {
            let _ = sqlx::query(r#"UPDATE User SET password = ? WHERE id = ?"#)
                .bind(h)
                .bind(user_id)
                .execute(pool)
                .await;
        }
        return true;
    }
    false
}

async fn session_user(
    state: &AppState,
    headers: &HeaderMap,
) -> Result<UserAuthRow, (StatusCode, Json<Value>)> {
    let auth = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok());
    let au = auth_user_from_request(&state.pool, &state.jwt_secret, auth)
        .await
        .ok_or((
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "Unauthenticated" })),
        ))?;
    sqlx::query_as::<_, UserAuthRow>(
        r#"SELECT id, username, password, isAdmin, avatarRelPath FROM User WHERE id = ?"#,
    )
    .bind(au.id)
    .fetch_optional(&state.pool)
    .await
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "db error" })),
        )
    })?
    .ok_or((
        StatusCode::UNAUTHORIZED,
        Json(json!({ "error": "Unauthenticated" })),
    ))
}

async fn admin_user(
    state: &AppState,
    headers: &HeaderMap,
) -> Result<UserAuthRow, (StatusCode, Json<Value>)> {
    let u = session_user(state, headers).await?;
    if !u.is_admin {
        return Err((
            StatusCode::FORBIDDEN,
            Json(json!({ "error": "Forbidden" })),
        ));
    }
    Ok(u)
}

async fn bootstrap(State(state): State<AppState>) -> Json<Value> {
    let n: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM User"#)
        .fetch_one(&state.pool)
        .await
        .unwrap_or(0);
    let legacy = if n == 1 {
        let un: Option<String> =
            sqlx::query_scalar(r#"SELECT username FROM User ORDER BY id ASC LIMIT 1"#)
                .fetch_optional(&state.pool)
                .await
                .ok()
                .flatten();
        un.as_deref() == Some("admin")
    } else {
        false
    };
    Json(json!({ "needsFirstUser": n == 0, "legacyMigratedAccount": legacy }))
}

async fn me(State(state): State<AppState>, headers: HeaderMap) -> Json<Value> {
    let auth = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok());
    let user = auth_user_from_request(&state.pool, &state.jwt_secret, auth).await;
    match user {
        None => Json(json!({ "user": null })),
        Some(u) => {
            let row = UserAuthRow {
                id: u.id,
                username: u.username,
                password: String::new(),
                is_admin: u.is_admin,
                avatar_rel_path: u.avatar_rel_path,
            };
            Json(json!({ "user": public_user(&row) }))
        }
    }
}

#[derive(Deserialize)]
struct CredentialsBody {
    username: Option<String>,
    password: Option<String>,
}

async fn register(
    State(state): State<AppState>,
    Json(body): Json<CredentialsBody>,
) -> Result<(StatusCode, Json<Value>), (StatusCode, Json<Value>)> {
    let n: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM User"#)
        .fetch_one(&state.pool)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "db error" })),
            )
        })?;
    if n > 0 {
        return Err((
            StatusCode::FORBIDDEN,
            Json(json!({ "error": "Registration is closed. Sign in or ask an admin to add a user." })),
        ));
    }
    let un = body
        .username
        .as_deref()
        .map(normalize_username)
        .unwrap_or_default();
    let pw = body.password.as_deref().unwrap_or("");
    if !is_valid_username(&un) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Invalid username. Use 2–32 letters, numbers, or underscores." })),
        ));
    }
    if let Err(msg) = validate_password_strength(pw) {
        return Err((StatusCode::BAD_REQUEST, Json(json!({ "error": msg }))));
    }
    let exists: Option<i64> = sqlx::query_scalar(
        r#"SELECT id FROM User WHERE username = ? OR email = ? LIMIT 1"#,
    )
    .bind(&un)
    .bind(email_for_username(&un))
    .fetch_optional(&state.pool)
    .await
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "db error" })),
        )
    })?;
    if exists.is_some() {
        return Err((
            StatusCode::CONFLICT,
            Json(json!({ "error": "User already exists." })),
        ));
    }
    let hashed = hash_password(pw).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e })),
        )
    })?;
    sqlx::query(
        r#"INSERT INTO User (email, username, password, isAdmin, ttsMode, ttsVoice, ttsModel, ttsSpeed, ttsPitch, ttsChunkMinChars, ttsChunkMaxChars, ttsChunkPeriodExtra, ttsReaderShowPage, ttsReaderShowTitle, ttsReaderStripPdfMargins, ttsReaderDarkDocument, createdAt, updatedAt) VALUES (?, ?, ?, 1, 'kokoro', 'af_heart', 'kokoro', 1.0, 1.0, 200, 300, 1500, 1, 1, 1, 0, datetime('now'), datetime('now'))"#,
    )
    .bind(email_for_username(&un))
    .bind(&un)
    .bind(hashed)
    .execute(&state.pool)
    .await
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "insert failed" })),
        )
    })?;
    let row: UserAuthRow = sqlx::query_as(
        r#"SELECT id, username, password, isAdmin, avatarRelPath FROM User WHERE username = ?"#,
    )
    .bind(&un)
    .fetch_one(&state.pool)
    .await
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "db error" })),
        )
    })?;
    let token = create_auth_token(row.id, true, AUTH_TOKEN_TTL_MS, &state.jwt_secret);
    Ok((
        StatusCode::CREATED,
        Json(json!({ "user": auth_user_json(&row, &token) })),
    ))
}

async fn login(
    State(state): State<AppState>,
    Json(body): Json<CredentialsBody>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let un = body
        .username
        .as_deref()
        .map(normalize_username)
        .unwrap_or_default();
    let pw = body.password.as_deref().unwrap_or("");
    if un.len() < 2 || pw.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Username and password required." })),
        ));
    }
    let row: UserAuthRow = sqlx::query_as(
        r#"SELECT id, username, password, isAdmin, avatarRelPath FROM User WHERE username = ?"#,
    )
    .bind(&un)
    .fetch_optional(&state.pool)
    .await
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "db error" })),
        )
    })?
    .ok_or((
        StatusCode::UNAUTHORIZED,
        Json(json!({ "error": "Invalid credentials." })),
    ))?;
    if !verify_password_with_legacy(&state.pool, row.id, pw, &row.password).await {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "Invalid credentials." })),
        ));
    }
    let token = create_auth_token(row.id, row.is_admin, AUTH_TOKEN_TTL_MS, &state.jwt_secret);
    Ok(Json(json!({ "user": auth_user_json(&row, &token) })))
}

#[derive(Deserialize)]
struct PasswordBody {
    #[serde(rename = "currentPassword")]
    current_password: Option<String>,
    #[serde(rename = "newPassword")]
    new_password: Option<String>,
}

async fn password_change(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<PasswordBody>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let u = session_user(&state, &headers).await?;
    let current = body.current_password.as_deref().unwrap_or("");
    let next = body.new_password.as_deref().unwrap_or("");
    if current.is_empty() || next.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Current and new password required." })),
        ));
    }
    if let Err(msg) = validate_password_strength(next) {
        return Err((StatusCode::BAD_REQUEST, Json(json!({ "error": msg }))));
    }
    if !verify_password_with_legacy(&state.pool, u.id, current, &u.password).await {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "Current password is incorrect." })),
        ));
    }
    let hashed = hash_password(next).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e })),
        )
    })?;
    sqlx::query(r#"UPDATE User SET password = ? WHERE id = ?"#)
        .bind(hashed)
        .bind(u.id)
        .execute(&state.pool)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "update failed" })),
            )
        })?;
    Ok(Json(json!({ "ok": true })))
}

async fn list_users(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let _ = admin_user(&state, &headers).await?;
    #[derive(FromRow)]
    struct ListRow {
        id: i64,
        username: String,
        #[sqlx(rename = "isAdmin")]
        is_admin: bool,
        #[sqlx(rename = "createdAt")]
        created_at: String,
        #[sqlx(rename = "avatarRelPath")]
        avatar_rel_path: Option<String>,
    }
    let rows: Vec<ListRow> = sqlx::query_as(
        r#"SELECT id, username, isAdmin, createdAt, avatarRelPath FROM User ORDER BY id ASC"#,
    )
    .fetch_all(&state.pool)
    .await
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "db error" })),
        )
    })?;
    let users: Vec<Value> = rows
        .iter()
        .map(|x| {
            json!({
                "id": x.id,
                "username": x.username,
                "isAdmin": x.is_admin,
                "hasAvatar": x.avatar_rel_path.is_some(),
                "createdAt": x.created_at,
            })
        })
        .collect();
    Ok(Json(json!({ "users": users })))
}

#[derive(Deserialize)]
struct CreateUserBody {
    username: Option<String>,
    password: Option<String>,
    #[serde(rename = "isAdmin")]
    is_admin: Option<bool>,
}

async fn create_user(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<CreateUserBody>,
) -> Result<(StatusCode, Json<Value>), (StatusCode, Json<Value>)> {
    let _ = admin_user(&state, &headers).await?;
    let un = body
        .username
        .as_deref()
        .map(normalize_username)
        .unwrap_or_default();
    let pw = body.password.as_deref().unwrap_or("");
    let is_admin = body.is_admin.unwrap_or(false);
    if !is_valid_username(&un) {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Invalid username. Use 2–32 letters, numbers, or underscores." })),
        ));
    }
    if let Err(msg) = validate_password_strength(pw) {
        return Err((StatusCode::BAD_REQUEST, Json(json!({ "error": msg }))));
    }
    let exists: Option<i64> = sqlx::query_scalar(
        r#"SELECT id FROM User WHERE username = ? OR email = ? LIMIT 1"#,
    )
    .bind(&un)
    .bind(email_for_username(&un))
    .fetch_optional(&state.pool)
    .await
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "db error" })),
        )
    })?;
    if exists.is_some() {
        return Err((
            StatusCode::CONFLICT,
            Json(json!({ "error": "User already exists." })),
        ));
    }
    let hashed = hash_password(pw).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": e })),
        )
    })?;
    sqlx::query(
        r#"INSERT INTO User (email, username, password, isAdmin, ttsMode, ttsVoice, ttsModel, ttsSpeed, ttsPitch, ttsChunkMinChars, ttsChunkMaxChars, ttsChunkPeriodExtra, ttsReaderShowPage, ttsReaderShowTitle, ttsReaderStripPdfMargins, ttsReaderDarkDocument, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'kokoro', 'af_heart', 'kokoro', 1.0, 1.0, 200, 300, 1500, 1, 1, 1, 0, datetime('now'), datetime('now'))"#,
    )
    .bind(email_for_username(&un))
    .bind(&un)
    .bind(hashed)
    .bind(if is_admin { 1 } else { 0 })
    .execute(&state.pool)
    .await
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "insert failed" })),
        )
    })?;
    let id: i64 = sqlx::query_scalar(r#"SELECT id FROM User WHERE username = ?"#)
        .bind(&un)
        .fetch_one(&state.pool)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "db error" })),
            )
        })?;
    Ok((
        StatusCode::CREATED,
        Json(json!({ "id": id, "username": un, "isAdmin": is_admin })),
    ))
}

async fn delete_user(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<i64>,
) -> Result<StatusCode, (StatusCode, Json<Value>)> {
    let session = admin_user(&state, &headers).await?;
    if id < 1 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Invalid user id" })),
        ));
    }
    if id == session.id {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "You cannot delete your own account" })),
        ));
    }
    #[derive(FromRow)]
    struct DeleteTarget {
        #[sqlx(rename = "isAdmin")]
        is_admin: bool,
        #[sqlx(rename = "avatarRelPath")]
        avatar_rel_path: Option<String>,
    }
    let target: Option<DeleteTarget> =
        sqlx::query_as(r#"SELECT isAdmin, avatarRelPath FROM User WHERE id = ?"#)
            .bind(id)
            .fetch_optional(&state.pool)
            .await
            .map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "error": "db error" })),
                )
            })?;
    let Some(target) = target else {
        return Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "User not found" })),
        ));
    };
    if target.is_admin {
        let admin_count: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM User WHERE isAdmin = 1"#)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);
        if admin_count <= 1 {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "Cannot delete the only administrator" })),
            ));
        }
    }
    if let Some(ref rel) = target.avatar_rel_path.filter(|p| !p.is_empty()) {
        let abs = crate::util::paths::abs_from_upload_rel(rel);
        let _ = tokio::fs::remove_file(abs).await;
    }
    sqlx::query(r#"DELETE FROM User WHERE id = ?"#)
        .bind(id)
        .execute(&state.pool)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "delete failed" })),
            )
        })?;
    Ok(StatusCode::NO_CONTENT)
}

async fn e2e_token(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    if std::env::var("NODE_ENV")
        .map(|v| v == "production")
        .unwrap_or(false)
    {
        return Err((
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Not found" })),
        ));
    }
    let expected = std::env::var("E2E_AUTH_KEY").unwrap_or_default();
    let expected = expected.trim();
    let provided = headers
        .get("x-e2e-key")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    if !expected.is_empty() && provided != expected {
        return Err((
            StatusCode::FORBIDDEN,
            Json(json!({ "error": "Forbidden" })),
        ));
    }
    const E2E_USERNAME: &str = "playwright";
    let row: Option<UserAuthRow> = sqlx::query_as(
        r#"SELECT id, username, password, isAdmin, avatarRelPath FROM User WHERE username = ?"#,
    )
    .bind(E2E_USERNAME)
    .fetch_optional(&state.pool)
    .await
    .map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "db error" })),
        )
    })?;
    let row = if let Some(r) = row {
        r
    } else {
        let pw = format!("Pw_{}!Aa1", rand::random::<u32>());
        let hashed = hash_password(&pw).map_err(|e| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": e })),
            )
        })?;
        sqlx::query(
            r#"INSERT INTO User (email, username, password, isAdmin, ttsMode, ttsVoice, ttsModel, ttsSpeed, ttsPitch, ttsChunkMinChars, ttsChunkMaxChars, ttsChunkPeriodExtra, ttsReaderShowPage, ttsReaderShowTitle, ttsReaderStripPdfMargins, ttsReaderDarkDocument, createdAt, updatedAt) VALUES (?, ?, ?, 1, 'kokoro', 'af_heart', 'kokoro', 1.0, 1.0, 200, 300, 1500, 1, 1, 1, 0, datetime('now'), datetime('now'))"#,
        )
        .bind(email_for_username(E2E_USERNAME))
        .bind(E2E_USERNAME)
        .bind(hashed)
        .execute(&state.pool)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "insert failed" })),
            )
        })?;
        sqlx::query_as(
            r#"SELECT id, username, password, isAdmin, avatarRelPath FROM User WHERE username = ?"#,
        )
        .bind(E2E_USERNAME)
        .fetch_one(&state.pool)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "db error" })),
            )
        })?
    };
    let token = create_auth_token(row.id, row.is_admin, AUTH_TOKEN_TTL_MS, &state.jwt_secret);
    Ok(Json(json!({ "user": auth_user_json(&row, &token) })))
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/bootstrap", get(bootstrap))
        .route("/e2e-token", post(e2e_token))
        .route("/me", get(me))
        .route("/register", post(register))
        .route("/login", post(login))
        .route("/password", post(password_change))
        .route("/users", get(list_users).post(create_user))
        .route("/users/{id}", delete(delete_user))
}