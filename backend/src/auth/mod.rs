mod helpers;
mod password;
mod token;

pub use helpers::{email_for_username, is_valid_username, normalize_username};
pub use password::{hash_password, validate_password_strength, verify_password_scrypt};
pub use token::{create_auth_token, bearer_token, verify_auth_token, AUTH_TOKEN_TTL_MS};

use sqlx::FromRow;
use sqlx::SqlitePool;

#[derive(Clone, Debug)]
pub struct AuthUser {
    pub id: i64,
    pub username: String,
    pub is_admin: bool,
    pub avatar_rel_path: Option<String>,
}

#[derive(FromRow)]
struct AuthUserRow {
    id: i64,
    username: String,
    #[sqlx(rename = "isAdmin")]
    is_admin: bool,
    #[sqlx(rename = "avatarRelPath")]
    avatar_rel_path: Option<String>,
}

pub async fn auth_user_from_request(
    pool: &SqlitePool,
    secret: &str,
    authorization: Option<&str>,
) -> Option<AuthUser> {
    let raw = bearer_token(authorization)?;
    let payload = verify_auth_token(raw, secret)?;
    let row = sqlx::query_as::<_, AuthUserRow>(
        r#"SELECT id, username, isAdmin, avatarRelPath FROM User WHERE id = ?"#,
    )
    .bind(payload.sub)
    .fetch_optional(pool)
    .await
    .ok()??;
    if row.is_admin != payload.adm {
        return None;
    }
    Some(AuthUser {
        id: row.id,
        username: row.username,
        is_admin: row.is_admin,
        avatar_rel_path: row.avatar_rel_path,
    })
}