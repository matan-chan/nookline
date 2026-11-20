use sqlx::FromRow;
use sqlx::SqlitePool;

#[derive(Clone)]
pub struct ResolvedTtsTarget {
    pub speech_url: String,
    pub authorization: Option<String>,
    pub default_voice: String,
    pub default_model: String,
}

#[derive(FromRow)]
struct TtsUserRow {
    #[sqlx(rename = "ttsMode")]
    tts_mode: String,
    #[sqlx(rename = "ttsCustomBaseUrl")]
    tts_custom_base_url: Option<String>,
    #[sqlx(rename = "ttsCustomApiKey")]
    tts_custom_api_key: Option<String>,
    #[sqlx(rename = "ttsVoice")]
    tts_voice: String,
    #[sqlx(rename = "ttsModel")]
    tts_model: String,
}

fn normalize_open_ai_tts_base_url(raw: &str) -> String {
    let mut s = raw.trim().trim_end_matches('/').to_string();
    for _ in 0..8 {
        if s.to_ascii_lowercase().ends_with("/v1") {
            s = s[..s.len() - 3].trim_end_matches('/').to_string();
        } else {
            break;
        }
    }
    s
}

fn local_kokoro_base_url() -> String {
    std::env::var("KOKORO_TTS_URL").unwrap_or_else(|_| "http://127.0.0.1:8881".to_string())
}

fn kokoro_preset_base_url() -> String {
    let docker = std::path::Path::new("/.dockerenv").exists();
    let raw = match std::env::var("TTS_URL") {
        Ok(url) if !docker && url.contains("kokoro:") => local_kokoro_base_url(),
        Ok(url) => url,
        Err(_) => local_kokoro_base_url(),
    };
    normalize_open_ai_tts_base_url(raw.trim())
}

fn build_kokoro_target(user: &TtsUserRow) -> ResolvedTtsTarget {
    let voice = user.tts_voice.trim();
    let voice = if voice.is_empty() { "af_heart" } else { voice };
    let model = user.tts_model.trim();
    let model = if model.is_empty() { "kokoro" } else { model };
    let base = kokoro_preset_base_url();
    ResolvedTtsTarget {
        speech_url: format!("{base}/v1/audio/speech"),
        authorization: None,
        default_voice: voice.to_string(),
        default_model: model.to_string(),
    }
}

fn build_custom_target(user: &TtsUserRow) -> Result<ResolvedTtsTarget, String> {
    let raw = user
        .tts_custom_base_url
        .as_deref()
        .map(str::trim)
        .unwrap_or("");
    if raw.is_empty() {
        return Err("Custom TTS is selected but no base URL is configured".to_string());
    }
    let base = normalize_open_ai_tts_base_url(raw);
    let key = user
        .tts_custom_api_key
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|k| format!("Bearer {k}"));
    let voice = user.tts_voice.trim();
    let voice = if voice.is_empty() { "af_heart" } else { voice };
    let model = user.tts_model.trim();
    let model = if model.is_empty() { "kokoro" } else { model };
    Ok(ResolvedTtsTarget {
        speech_url: format!("{base}/v1/audio/speech"),
        authorization: key,
        default_voice: voice.to_string(),
        default_model: model.to_string(),
    })
}

pub async fn resolve_tts_target(pool: &SqlitePool, user_id: i64) -> Result<ResolvedTtsTarget, String> {
    let user = sqlx::query_as::<_, TtsUserRow>(
        r#"SELECT ttsMode, ttsCustomBaseUrl, ttsCustomApiKey, ttsVoice, ttsModel FROM User WHERE id = ?"#,
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| "User not found".to_string())?;
    if user.tts_mode == "custom" {
        build_custom_target(&user)
    } else {
        Ok(build_kokoro_target(&user))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};

    const INIT_SQL: &str = include_str!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../backend/prisma/migrations/20260509174920_init/migration.sql"
    ));

    async fn pool_with_users() -> SqlitePool {
        let dir = tempfile::tempdir().expect("tmpdir");
        let db = dir.path().join("tts.db");
        let opts = SqliteConnectOptions::new()
            .filename(&db)
            .create_if_missing(true);
        let pool = SqlitePoolOptions::new()
            .connect_with(opts)
            .await
            .expect("pool");
        for stmt in INIT_SQL.split(';').filter(|s| !s.trim().is_empty()) {
            sqlx::query(stmt).execute(&pool).await.expect("migrate");
        }
        std::mem::forget(dir);
        sqlx::query(
            r#"INSERT INTO User (email, username, password, isAdmin, ttsMode, ttsCustomBaseUrl, ttsVoice, ttsModel, ttsSpeed, ttsPitch, ttsChunkMinChars, ttsChunkMaxChars, ttsChunkPeriodExtra, ttsReaderShowPage, ttsReaderShowTitle, ttsReaderStripPdfMargins, ttsReaderDarkDocument, createdAt, updatedAt) VALUES ('a@t','u1','x',0,'kokoro',NULL,'af_test','kokoro',1,1,200,300,1500,1,1,1,0,datetime('now'),datetime('now'))"#,
        )
        .execute(&pool)
        .await
        .expect("u1");
        sqlx::query(
            r#"INSERT INTO User (email, username, password, isAdmin, ttsMode, ttsCustomBaseUrl, ttsVoice, ttsModel, ttsSpeed, ttsPitch, ttsChunkMinChars, ttsChunkMaxChars, ttsChunkPeriodExtra, ttsReaderShowPage, ttsReaderShowTitle, ttsReaderStripPdfMargins, ttsReaderDarkDocument, createdAt, updatedAt) VALUES ('b@t','u2','x',0,'custom','http://kokoro.test:8880/v1/','af_heart','kokoro',1,1,200,300,1500,1,1,1,0,datetime('now'),datetime('now'))"#,
        )
        .execute(&pool)
        .await
        .expect("u2");
        sqlx::query(
            r#"INSERT INTO User (email, username, password, isAdmin, ttsMode, ttsCustomBaseUrl, ttsVoice, ttsModel, ttsSpeed, ttsPitch, ttsChunkMinChars, ttsChunkMaxChars, ttsChunkPeriodExtra, ttsReaderShowPage, ttsReaderShowTitle, ttsReaderStripPdfMargins, ttsReaderDarkDocument, createdAt, updatedAt) VALUES ('c@t','u3','x',0,'custom','http://double.test/v1/v1','af_bella','kokoro',1,1,200,300,1500,1,1,1,0,datetime('now'),datetime('now'))"#,
        )
        .execute(&pool)
        .await
        .expect("u3");
        pool
    }

    #[tokio::test]
    async fn resolve_kokoro_and_custom_urls() {
        let pool = pool_with_users().await;
        let t1 = resolve_tts_target(&pool, 1).await.expect("u1");
        assert!(t1.speech_url.contains("/v1/audio/speech"));
        assert!(t1.authorization.is_none());
        assert_eq!(t1.default_voice, "af_test");

        let t2 = resolve_tts_target(&pool, 2).await.expect("u2");
        assert_eq!(t2.speech_url, "http://kokoro.test:8880/v1/audio/speech");

        let t3 = resolve_tts_target(&pool, 3).await.expect("u3");
        assert_eq!(t3.speech_url, "http://double.test/v1/audio/speech");
    }
}