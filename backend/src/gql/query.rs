use async_graphql::{Context, Object, Result};
use std::sync::Arc;

use crate::auth::AuthUser;
use crate::db::{
    book_for_user, bookmarks_for_book, favorite_books_for_user, highlights_for_book,
    libraries_for_user, library_for_user, load_app_customization, load_tts_settings,
    on_deck_for_user, recently_added_for_user, recommended_books_for_user, series_for_user,
    series_list_for_user, user_bookmarks, user_highlights, voice_profiles_for_user,
};
use crate::gql::extra_types::{
    AppCustomizationGql, BookmarkGql, BookWithProgressGql, HighlightGql, ReadingProgressGql,
    TtsEngineProbeGql, TtsSettingsGql, UserBookmarkGql, UserHighlightGql, VoiceProfileGql,
};
use crate::gql::types::{require_user, AuthUserGql, BookGql, LibraryGql, SeriesGql};
use crate::services::tts_resolve::resolve_tts_target;
use crate::state::AppState;

pub struct QueryRoot;

#[Object]
impl QueryRoot {
    async fn health(&self) -> &str {
        "ok"
    }

    async fn me(&self, ctx: &Context<'_>) -> Result<Option<AuthUserGql>> {
        let user = ctx.data::<Option<Arc<AuthUser>>>()?;
        Ok(user.as_ref().map(|u| AuthUserGql::from((**u).clone())))
    }

    async fn libraries(&self, ctx: &Context<'_>) -> Result<Vec<LibraryGql>> {
        let state = ctx.data_unchecked::<AppState>();
        let Some(user) = ctx.data::<Option<Arc<AuthUser>>>()?.as_ref() else {
            return Ok(vec![]);
        };
        let rows = libraries_for_user(&state.pool, user.id).await?;
        Ok(rows.into_iter().map(LibraryGql).collect())
    }

    async fn library(&self, ctx: &Context<'_>, id: i32) -> Result<Option<LibraryGql>> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        let row = library_for_user(&state.pool, user.id, id as i64).await?;
        Ok(row.map(LibraryGql))
    }

    async fn series_list(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "libraryId")] library_id: i32,
    ) -> Result<Vec<SeriesGql>> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        let rows = series_list_for_user(&state.pool, user.id, library_id as i64).await?;
        Ok(rows.into_iter().map(SeriesGql).collect())
    }

    async fn series(&self, ctx: &Context<'_>, id: i32) -> Result<Option<SeriesGql>> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        let row = series_for_user(&state.pool, user.id, id as i64).await?;
        Ok(row.map(SeriesGql))
    }

    async fn book(&self, ctx: &Context<'_>, id: i32) -> Result<Option<BookGql>> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        let row = book_for_user(&state.pool, user.id, id as i64).await?;
        Ok(row.map(BookGql))
    }

    async fn recently_added(&self, ctx: &Context<'_>, limit: Option<i32>) -> Result<Vec<BookGql>> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        let lim = limit.unwrap_or(20).clamp(1, 200) as i64;
        let rows = recently_added_for_user(&state.pool, user.id, lim).await?;
        Ok(rows.into_iter().map(BookGql).collect())
    }

    async fn favorite_books(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "userId")] user_id: i32,
        limit: Option<i32>,
    ) -> Result<Vec<BookGql>> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        if user_id != user.id as i32 {
            return Err(async_graphql::Error::new("Forbidden"));
        }
        let lim = limit.unwrap_or(48).clamp(1, 200) as i64;
        let rows = favorite_books_for_user(&state.pool, user.id, lim).await?;
        Ok(rows.into_iter().map(BookGql).collect())
    }

    async fn recommended_books_for_book(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "bookId")] book_id: i32,
        limit: Option<i32>,
    ) -> Result<Vec<BookGql>> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        let lim = limit.unwrap_or(10).clamp(1, 20) as i64;
        let rows =
            recommended_books_for_user(&state.pool, user.id, book_id as i64, lim).await?;
        Ok(rows.into_iter().map(BookGql).collect())
    }

    async fn on_deck(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "userId")] user_id: i32,
    ) -> Result<Vec<BookWithProgressGql>> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        if user_id != user.id as i32 {
            return Err(async_graphql::Error::new("Forbidden"));
        }
        let rows = on_deck_for_user(&state.pool, user.id).await?;
        Ok(rows
            .into_iter()
            .map(|(book, progress)| BookWithProgressGql {
                book: BookGql(book),
                progress: ReadingProgressGql::from(progress),
            })
            .collect())
    }

    async fn bookmarks(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "bookId")] book_id: i32,
    ) -> Result<Vec<BookmarkGql>> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        let rows = bookmarks_for_book(&state.pool, user.id, book_id as i64).await?;
        Ok(rows.into_iter().map(BookmarkGql::from).collect())
    }

    async fn highlights(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "bookId")] book_id: i32,
    ) -> Result<Vec<HighlightGql>> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        let rows = highlights_for_book(&state.pool, user.id, book_id as i64).await?;
        Ok(rows.into_iter().map(HighlightGql::from).collect())
    }

    async fn user_bookmarks(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "userId")] user_id: i32,
    ) -> Result<Vec<UserBookmarkGql>> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        if user_id != user.id as i32 {
            return Err(async_graphql::Error::new("Forbidden"));
        }
        let rows = user_bookmarks(&state.pool, user.id).await?;
        Ok(rows.into_iter().map(UserBookmarkGql::from).collect())
    }

    async fn user_highlights(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "userId")] user_id: i32,
    ) -> Result<Vec<UserHighlightGql>> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        if user_id != user.id as i32 {
            return Err(async_graphql::Error::new("Forbidden"));
        }
        let rows = user_highlights(&state.pool, user.id).await?;
        Ok(rows.into_iter().map(UserHighlightGql::from).collect())
    }

    async fn tts_settings(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "userId")] user_id: i32,
    ) -> Result<TtsSettingsGql> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        if user_id != user.id as i32 {
            return Err(async_graphql::Error::new("Forbidden"));
        }
        let view = load_tts_settings(&state.pool, user.id).await?;
        Ok(TtsSettingsGql::from(view))
    }

    async fn tts_engine_probe(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "userId")] user_id: i32,
    ) -> Result<TtsEngineProbeGql> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        if user_id != user.id as i32 {
            return Err(async_graphql::Error::new("Forbidden"));
        }
        match resolve_tts_target(&state.pool, user.id).await {
            Ok(target) => {
                let probe = crate::services::tts_probe::probe_tts_synthesis(&target).await;
                Ok(TtsEngineProbeGql {
                    ok: probe.ok,
                    error: probe.error,
                })
            }
            Err(e) => Ok(TtsEngineProbeGql {
                ok: false,
                error: Some(e),
            }),
        }
    }

    async fn voice_profiles(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "userId")] user_id: i32,
    ) -> Result<Vec<VoiceProfileGql>> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        if user_id != user.id as i32 {
            return Err(async_graphql::Error::new("Forbidden"));
        }
        let rows = voice_profiles_for_user(&state.pool, user.id).await?;
        Ok(rows.into_iter().map(VoiceProfileGql::from).collect())
    }

    async fn app_customization(&self, ctx: &Context<'_>) -> Result<AppCustomizationGql> {
        let state = ctx.data_unchecked::<AppState>();
        let view = load_app_customization(&state.pool).await?;
        Ok(AppCustomizationGql::from(view))
    }
}