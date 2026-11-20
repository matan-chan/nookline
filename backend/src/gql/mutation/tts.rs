use async_graphql::{Context, InputObject, Object, Result};

use crate::db::{
    create_voice_profile, delete_voice_profile, update_tts_settings, UpdateTtsSettingsInput,
};
use crate::gql::extra_types::{TtsSettingsGql, VoiceProfileGql};
use crate::gql::types::require_user;
use crate::state::AppState;

#[derive(Default)]
pub struct TtsMutation;

#[derive(InputObject)]
#[graphql(name = "UpdateTtsSettingsInput")]
pub struct UpdateTtsSettingsInputGql {
    #[graphql(name = "userId")]
    pub user_id: i32,
    pub mode: String,
    #[graphql(name = "customBaseUrl")]
    pub custom_base_url: Option<String>,
    #[graphql(name = "customApiKey")]
    pub custom_api_key: Option<String>,
    pub voice: Option<String>,
    pub model: Option<String>,
    pub speed: Option<f64>,
    pub pitch: Option<f64>,
    #[graphql(name = "chunkMinChars")]
    pub chunk_min_chars: Option<i32>,
    #[graphql(name = "chunkMaxChars")]
    pub chunk_max_chars: Option<i32>,
    #[graphql(name = "chunkPeriodExtra")]
    pub chunk_period_extra: Option<i32>,
    #[graphql(name = "readerShowPage")]
    pub reader_show_page: Option<bool>,
    #[graphql(name = "readerShowTitle")]
    pub reader_show_title: Option<bool>,
    #[graphql(name = "readerStripPdfMargins")]
    pub reader_strip_pdf_margins: Option<bool>,
    #[graphql(name = "readerDarkDocument")]
    pub reader_dark_document: Option<bool>,
}

#[derive(InputObject)]
pub struct SaveVoiceProfileInput {
    #[graphql(name = "userId")]
    pub user_id: i32,
    pub name: String,
    #[graphql(name = "modelId")]
    pub model_id: String,
    pub speed: Option<f64>,
    pub pitch: Option<f64>,
    #[graphql(name = "isDefault")]
    pub is_default: Option<bool>,
}

#[Object]
impl TtsMutation {
    async fn update_tts_settings(
        &self,
        ctx: &Context<'_>,
        input: UpdateTtsSettingsInputGql,
    ) -> Result<TtsSettingsGql> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        if input.user_id != user.id as i32 {
            return Err(async_graphql::Error::new("Forbidden"));
        }
        let view = update_tts_settings(
            &state.pool,
            user.id,
            UpdateTtsSettingsInput {
                mode: input.mode,
                custom_base_url: input.custom_base_url,
                custom_api_key: input.custom_api_key,
                voice: input.voice,
                model: input.model,
                speed: input.speed,
                pitch: input.pitch,
                chunk_min_chars: input.chunk_min_chars,
                chunk_max_chars: input.chunk_max_chars,
                chunk_period_extra: input.chunk_period_extra,
                reader_show_page: input.reader_show_page,
                reader_show_title: input.reader_show_title,
                reader_strip_pdf_margins: input.reader_strip_pdf_margins,
                reader_dark_document: input.reader_dark_document,
            },
        )
        .await?;
        Ok(TtsSettingsGql::from(view))
    }

    async fn save_voice_profile(
        &self,
        ctx: &Context<'_>,
        input: SaveVoiceProfileInput,
    ) -> Result<VoiceProfileGql> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        if input.user_id != user.id as i32 {
            return Err(async_graphql::Error::new("Forbidden"));
        }
        let row = create_voice_profile(
            &state.pool,
            user.id,
            &input.name,
            &input.model_id,
            input.speed.unwrap_or(1.0),
            input.pitch.unwrap_or(1.0),
            input.is_default.unwrap_or(false),
        )
        .await?;
        Ok(VoiceProfileGql::from(row))
    }

    async fn delete_voice_profile(&self, ctx: &Context<'_>, id: i32) -> Result<bool> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        delete_voice_profile(&state.pool, user.id, id as i64)
            .await
            .map_err(async_graphql::Error::from)
    }
}