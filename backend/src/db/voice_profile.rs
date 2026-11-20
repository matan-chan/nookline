use sqlx::FromRow;
use sqlx::SqlitePool;

use super::sql_datetime::NORMALIZE_CREATED_AT;

#[derive(Clone, FromRow)]
pub struct VoiceProfileRow {
    pub id: i64,
    #[sqlx(rename = "userId")]
    pub user_id: i64,
    pub name: String,
    #[sqlx(rename = "modelId")]
    pub model_id: String,
    pub speed: f64,
    pub pitch: f64,
    #[sqlx(rename = "isDefault")]
    pub is_default: bool,
    #[sqlx(rename = "createdAt")]
    pub created_at: String,
}

pub async fn voice_profiles_for_user(
    pool: &SqlitePool,
    user_id: i64,
) -> Result<Vec<VoiceProfileRow>, sqlx::Error> {
    sqlx::query_as::<_, VoiceProfileRow>(&format!(
        "SELECT id, userId, name, modelId, speed, pitch, isDefault, {NORMALIZE_CREATED_AT} AS createdAt FROM VoiceProfile WHERE userId = ? ORDER BY id ASC"
    ))
    .bind(user_id)
    .fetch_all(pool)
    .await
}

pub async fn create_voice_profile(
    pool: &SqlitePool,
    user_id: i64,
    name: &str,
    model_id: &str,
    speed: f64,
    pitch: f64,
    is_default: bool,
) -> Result<VoiceProfileRow, sqlx::Error> {
    let speed = if speed.is_nan() { 1.0 } else { speed };
    let pitch = if pitch.is_nan() { 1.0 } else { pitch };
    sqlx::query_as::<_, VoiceProfileRow>(
        r#"INSERT INTO VoiceProfile (userId, name, modelId, speed, pitch, isDefault, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        RETURNING id, userId, name, modelId, speed, pitch, isDefault, createdAt"#,
    )
    .bind(user_id)
    .bind(name.trim())
    .bind(model_id.trim())
    .bind(speed)
    .bind(pitch)
    .bind(is_default)
    .fetch_one(pool)
    .await
}

pub async fn delete_voice_profile(
    pool: &SqlitePool,
    user_id: i64,
    id: i64,
) -> Result<bool, sqlx::Error> {
    let r = sqlx::query(r#"DELETE FROM VoiceProfile WHERE id = ? AND userId = ?"#)
        .bind(id)
        .bind(user_id)
        .execute(pool)
        .await?;
    Ok(r.rows_affected() > 0)
}
