use async_graphql::{Context, InputObject, Object, Result};

use crate::db::{
    assert_library_owned, book_for_user, create_book_record, delete_book_for_user, set_book_favorite,
    upsert_reading_progress, CreateBookInput,
};
use crate::gql::extra_types::ReadingProgressGql;
use crate::gql::types::{require_user, BookGql};
use crate::services::library_disk_sync::assert_book_readable;
use crate::state::AppState;

#[derive(Default)]
pub struct BookMutation;

#[derive(InputObject)]
#[graphql(name = "CreateBookInput")]
pub struct CreateBookInputGql {
    #[graphql(name = "libraryId")]
    pub library_id: i32,
    #[graphql(name = "seriesId")]
    pub series_id: Option<i32>,
    #[graphql(name = "openLibrarySeriesName")]
    pub open_library_series_name: Option<String>,
    pub title: String,
    #[graphql(name = "filePath")]
    pub file_path: String,
    #[graphql(name = "coverImagePath")]
    pub cover_image_path: Option<String>,
    #[graphql(name = "volumeNumber")]
    pub volume_number: Option<f64>,
    pub metadata: Option<String>,
}

#[derive(InputObject)]
pub struct UpdateReadingProgressInput {
    #[graphql(name = "userId")]
    pub user_id: i32,
    #[graphql(name = "bookId")]
    pub book_id: i32,
    pub position: String,
    pub percentage: f64,
}

#[Object]
impl BookMutation {
    async fn create_book(&self, ctx: &Context<'_>, input: CreateBookInputGql) -> Result<BookGql> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        assert_library_owned(&state.pool, user.id, input.library_id as i64)
            .await
            .map_err(|_| async_graphql::Error::new("Library not found"))?;
        let row = create_book_record(
            &state.pool,
            CreateBookInput {
                library_id: input.library_id as i64,
                series_id: input.series_id.map(|id| id as i64),
                open_library_series_name: input.open_library_series_name,
                title: input.title,
                file_path: input.file_path,
                cover_image_path: input.cover_image_path,
                volume_number: input.volume_number,
                metadata: input.metadata,
            },
        )
        .await?;
        Ok(BookGql(row))
    }

    async fn delete_book(&self, ctx: &Context<'_>, id: i32) -> Result<bool> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        delete_book_for_user(&state.pool, user.id, id as i64)
            .await
            .map_err(async_graphql::Error::from)
    }

    async fn enrich_book_from_open_library(&self, ctx: &Context<'_>, id: i32) -> Result<BookGql> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        let row = crate::services::open_library::enrich_book_record(&state.pool, user.id, id as i64)
            .await?
            .ok_or_else(|| async_graphql::Error::new("Book not found"))?;
        Ok(BookGql(row))
    }

    async fn set_book_favorite(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "userId")] user_id: i32,
        #[graphql(name = "bookId")] book_id: i32,
        liked: bool,
    ) -> Result<BookGql> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        if user_id != user.id as i32 {
            return Err(async_graphql::Error::new("Forbidden"));
        }
        assert_book_readable(&state.pool, user.id, book_id as i64)
            .await
            .map_err(async_graphql::Error::new)?;
        set_book_favorite(&state.pool, user.id, book_id as i64, liked)
            .await
            .map_err(async_graphql::Error::from)?;
        let row = book_for_user(&state.pool, user.id, book_id as i64)
            .await?
            .ok_or_else(|| async_graphql::Error::new("Book not found"))?;
        Ok(BookGql(row))
    }

    async fn update_reading_progress(
        &self,
        ctx: &Context<'_>,
        input: UpdateReadingProgressInput,
    ) -> Result<ReadingProgressGql> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        if input.user_id != user.id as i32 {
            return Err(async_graphql::Error::new("Forbidden"));
        }
        assert_book_readable(&state.pool, user.id, input.book_id as i64)
            .await
            .map_err(async_graphql::Error::new)?;
        let row = upsert_reading_progress(
            &state.pool,
            user.id,
            input.book_id as i64,
            &input.position,
            input.percentage,
        )
        .await?;
        Ok(ReadingProgressGql::from(row))
    }
}