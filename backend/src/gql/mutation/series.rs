use async_graphql::{Context, InputObject, Object, Result};

use crate::db::{create_series, delete_series_for_user, CreateSeriesInput};
use crate::gql::types::{require_user, SeriesGql};
use crate::state::AppState;

#[derive(Default)]
pub struct SeriesMutation;

#[derive(InputObject)]
#[graphql(name = "CreateSeriesInput")]
pub struct CreateSeriesInputGql {
    #[graphql(name = "libraryId")]
    pub library_id: i32,
    pub title: String,
    pub description: Option<String>,
    #[graphql(name = "coverImagePath")]
    pub cover_image_path: Option<String>,
    pub metadata: Option<String>,
    pub status: Option<String>,
}

#[Object]
impl SeriesMutation {
    async fn create_series(
        &self,
        ctx: &Context<'_>,
        input: CreateSeriesInputGql,
    ) -> Result<SeriesGql> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        let row = create_series(
            &state.pool,
            user.id,
            CreateSeriesInput {
                library_id: input.library_id as i64,
                title: input.title,
                description: input.description,
                cover_image_path: input.cover_image_path,
                metadata: input.metadata,
                status: input.status,
            },
        )
        .await?;
        Ok(SeriesGql(row))
    }

    async fn delete_series(&self, ctx: &Context<'_>, id: i32) -> Result<bool> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        delete_series_for_user(&state.pool, user.id, id as i64)
            .await
            .map_err(async_graphql::Error::from)
    }

    async fn enrich_series_from_open_library(
        &self,
        ctx: &Context<'_>,
        id: i32,
    ) -> Result<SeriesGql> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        let row =
            crate::services::open_library::enrich_series_record(&state.pool, user.id, id as i64)
                .await?
                .ok_or_else(|| async_graphql::Error::new("Series not found"))?;
        Ok(SeriesGql(row))
    }
}