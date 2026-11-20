use sqlx::FromRow;
use sqlx::SqlitePool;

#[derive(Clone, FromRow)]
pub struct TtsUserRow {
    #[sqlx(rename = "ttsMode")]
    pub tts_mode: String,
    #[sqlx(rename = "ttsCustomBaseUrl")]
    pub tts_custom_base_url: Option<String>,
    #[sqlx(rename = "ttsCustomApiKey")]
    pub tts_custom_api_key: Option<String>,
    #[sqlx(rename = "ttsVoice")]
    pub tts_voice: String,
    #[sqlx(rename = "ttsModel")]
    pub tts_model: String,
    #[sqlx(rename = "ttsSpeed")]
    pub tts_speed: f64,
    #[sqlx(rename = "ttsPitch")]
    pub tts_pitch: f64,
    #[sqlx(rename = "ttsChunkMinChars")]
    pub tts_chunk_min_chars: i64,
    #[sqlx(rename = "ttsChunkMaxChars")]
    pub tts_chunk_max_chars: i64,
    #[sqlx(rename = "ttsChunkPeriodExtra")]
    pub tts_chunk_period_extra: i64,
    #[sqlx(rename = "ttsReaderShowPage")]
    pub tts_reader_show_page: bool,
    #[sqlx(rename = "ttsReaderShowTitle")]
    pub tts_reader_show_title: bool,
    #[sqlx(rename = "ttsReaderStripPdfMargins")]
    pub tts_reader_strip_pdf_margins: bool,
    #[sqlx(rename = "ttsReaderDarkDocument")]
    pub tts_reader_dark_document: bool,
}

pub struct TtsSettingsView {
    pub mode: String,
    pub custom_base_url: Option<String>,
    pub has_custom_api_key: bool,
    pub voice: String,
    pub model: String,
    pub speed: f64,
    pub pitch: f64,
    pub chunk_min_chars: i64,
    pub chunk_max_chars: i64,
    pub chunk_period_extra: i64,
    pub reader_show_page: bool,
    pub reader_show_title: bool,
    pub reader_strip_pdf_margins: bool,
    pub reader_dark_document: bool,
}

fn clamp_speed(n: f64) -> f64 {
    if n.is_nan() {
        return 1.0;
    }
    n.clamp(0.25, 4.0)
}

pub fn tts_settings_from_row(u: &TtsUserRow) -> TtsSettingsView {
    let min_c = u.tts_chunk_min_chars.clamp(20, 4000);
    let mut max_c = u.tts_chunk_max_chars.clamp(50, 50000);
    if max_c < min_c + 10 {
        max_c = (min_c + 10).min(50000);
    }
    TtsSettingsView {
        mode: u.tts_mode.clone(),
        custom_base_url: u.tts_custom_base_url.clone(),
        has_custom_api_key: u
            .tts_custom_api_key
            .as_deref()
            .map(str::trim)
            .is_some_and(|s| !s.is_empty()),
        voice: if u.tts_voice.trim().is_empty() {
            "af_heart".to_string()
        } else {
            u.tts_voice.clone()
        },
        model: if u.tts_model.trim().is_empty() {
            "kokoro".to_string()
        } else {
            u.tts_model.clone()
        },
        speed: clamp_speed(u.tts_speed),
        pitch: clamp_speed(u.tts_pitch),
        chunk_min_chars: min_c,
        chunk_max_chars: max_c,
        chunk_period_extra: u.tts_chunk_period_extra.clamp(0, 50000),
        reader_show_page: u.tts_reader_show_page,
        reader_show_title: u.tts_reader_show_title,
        reader_strip_pdf_margins: u.tts_reader_strip_pdf_margins,
        reader_dark_document: u.tts_reader_dark_document,
    }
}

pub struct UpdateTtsSettingsInput {
    pub mode: String,
    pub custom_base_url: Option<String>,
    pub custom_api_key: Option<String>,
    pub voice: Option<String>,
    pub model: Option<String>,
    pub speed: Option<f64>,
    pub pitch: Option<f64>,
    pub chunk_min_chars: Option<i32>,
    pub chunk_max_chars: Option<i32>,
    pub chunk_period_extra: Option<i32>,
    pub reader_show_page: Option<bool>,
    pub reader_show_title: Option<bool>,
    pub reader_strip_pdf_margins: Option<bool>,
    pub reader_dark_document: Option<bool>,
}

fn clamp_chunk_int(n: i64, lo: i64, hi: i64, def: i64) -> i64 {
    if n < lo || n > hi {
        def
    } else {
        n
    }
}

fn normalize_chunk_triple(min: i64, max: i64, period: i64) -> (i64, i64, i64) {
    let min_c = clamp_chunk_int(min, 20, 4000, 200);
    let mut max_c = clamp_chunk_int(max, 50, 50000, 300);
    if max_c < min_c + 10 {
        max_c = (min_c + 10).min(50000);
    }
    let period_c = clamp_chunk_int(period, 0, 50000, 1500);
    (min_c, max_c, period_c)
}

pub async fn update_tts_settings(
    pool: &SqlitePool,
    user_id: i64,
    input: UpdateTtsSettingsInput,
) -> Result<TtsSettingsView, sqlx::Error> {
    let existing = sqlx::query_as::<_, TtsUserRow>(
        r#"SELECT ttsMode, ttsCustomBaseUrl, ttsCustomApiKey, ttsVoice, ttsModel, ttsSpeed, ttsPitch, ttsChunkMinChars, ttsChunkMaxChars, ttsChunkPeriodExtra, ttsReaderShowPage, ttsReaderShowTitle, ttsReaderStripPdfMargins, ttsReaderDarkDocument FROM User WHERE id = ?"#,
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or(sqlx::Error::RowNotFound)?;

    let custom_base = if let Some(s) = input.custom_base_url {
        let t = s.trim();
        if t.is_empty() {
            None
        } else {
            Some(t.to_string())
        }
    } else {
        existing.tts_custom_base_url
    };

    let custom_key = if let Some(k) = input.custom_api_key {
        let t = k.trim();
        if t.is_empty() {
            None
        } else {
            Some(t.to_string())
        }
    } else {
        existing.tts_custom_api_key
    };

    let voice = input
        .voice
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| {
            if existing.tts_voice.trim().is_empty() {
                "af_heart".to_string()
            } else {
                existing.tts_voice.clone()
            }
        });
    let model = input
        .model
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| {
            if existing.tts_model.trim().is_empty() {
                "kokoro".to_string()
            } else {
                existing.tts_model.clone()
            }
        });
    let speed = input
        .speed
        .map(clamp_speed)
        .unwrap_or(clamp_speed(existing.tts_speed));
    let pitch = input
        .pitch
        .map(clamp_speed)
        .unwrap_or(clamp_speed(existing.tts_pitch));

    let (min_c, max_c, period_c) = if input.chunk_min_chars.is_some()
        || input.chunk_max_chars.is_some()
        || input.chunk_period_extra.is_some()
    {
        normalize_chunk_triple(
            input
                .chunk_min_chars
                .map(i64::from)
                .unwrap_or(existing.tts_chunk_min_chars),
            input
                .chunk_max_chars
                .map(i64::from)
                .unwrap_or(existing.tts_chunk_max_chars),
            input
                .chunk_period_extra
                .map(i64::from)
                .unwrap_or(existing.tts_chunk_period_extra),
        )
    } else {
        (
            existing.tts_chunk_min_chars,
            existing.tts_chunk_max_chars,
            existing.tts_chunk_period_extra,
        )
    };

    sqlx::query(
        r#"UPDATE User SET ttsMode = ?, ttsCustomBaseUrl = ?, ttsCustomApiKey = ?, ttsVoice = ?, ttsModel = ?, ttsSpeed = ?, ttsPitch = ?, ttsChunkMinChars = ?, ttsChunkMaxChars = ?, ttsChunkPeriodExtra = ?, ttsReaderShowPage = ?, ttsReaderShowTitle = ?, ttsReaderStripPdfMargins = ?, ttsReaderDarkDocument = ?, updatedAt = datetime('now') WHERE id = ?"#,
    )
    .bind(input.mode.trim())
    .bind(custom_base)
    .bind(custom_key)
    .bind(voice)
    .bind(model)
    .bind(speed)
    .bind(pitch)
    .bind(min_c)
    .bind(max_c)
    .bind(period_c)
    .bind(input.reader_show_page.unwrap_or(existing.tts_reader_show_page))
    .bind(input.reader_show_title.unwrap_or(existing.tts_reader_show_title))
    .bind(
        input
            .reader_strip_pdf_margins
            .unwrap_or(existing.tts_reader_strip_pdf_margins),
    )
    .bind(
        input
            .reader_dark_document
            .unwrap_or(existing.tts_reader_dark_document),
    )
    .bind(user_id)
    .execute(pool)
    .await?;
    load_tts_settings(pool, user_id).await
}

pub async fn load_tts_settings(
    pool: &SqlitePool,
    user_id: i64,
) -> Result<TtsSettingsView, sqlx::Error> {
    let row = sqlx::query_as::<_, TtsUserRow>(
        r#"SELECT ttsMode, ttsCustomBaseUrl, ttsCustomApiKey, ttsVoice, ttsModel, ttsSpeed, ttsPitch, ttsChunkMinChars, ttsChunkMaxChars, ttsChunkPeriodExtra, ttsReaderShowPage, ttsReaderShowTitle, ttsReaderStripPdfMargins, ttsReaderDarkDocument FROM User WHERE id = ?"#,
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?;
    let Some(u) = row else {
        return Err(sqlx::Error::RowNotFound);
    };
    Ok(tts_settings_from_row(&u))
}
