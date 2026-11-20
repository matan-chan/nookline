use async_graphql::{Context, InputObject, Object, Result};

use crate::db::{
    create_library, delete_library_owned, normalize_library_banner_index, random_library_banner_index,
    update_library,
};
use crate::gql::types::{require_user, BookGql, LibraryGql};
use crate::services::library_disk_sync::sync_library_books_from_disk;
use crate::state::AppState;

#[derive(Default)]
pub struct LibraryMutation;

#[derive(InputObject)]
pub struct CreateLibraryInput {
    pub name: String,
    pub path: String,
    #[graphql(name = "type")]
    pub library_type: String,
    #[graphql(name = "bannerIndex")]
    pub banner_index: Option<i32>,
    #[graphql(name = "customLibraryBannerId")]
    pub custom_library_banner_id: Option<i32>,
}

#[derive(InputObject)]
pub struct UpdateLibraryInput {
    pub name: String,
    pub path: String,
    #[graphql(name = "type")]
    pub library_type: String,
    #[graphql(name = "bannerIndex")]
    pub banner_index: Option<i32>,
    #[graphql(name = "customLibraryBannerId")]
    pub custom_library_banner_id: Option<i32>,
}

#[Object]
impl LibraryMutation {
    async fn create_library(
        &self,
        ctx: &Context<'_>,
        input: CreateLibraryInput,
    ) -> Result<LibraryGql> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        let banner = normalize_library_banner_index(input.banner_index)
            .unwrap_or_else(random_library_banner_index);
        let custom = input
            .custom_library_banner_id
            .filter(|id| *id > 0)
            .map(|id| id as i64);
        let row = create_library(
            &state.pool,
            user.id,
            &input.name,
            &input.path,
            &input.library_type,
            banner,
            custom,
        )
        .await?;
        Ok(LibraryGql(row))
    }

    async fn update_library(
        &self,
        ctx: &Context<'_>,
        id: i32,
        input: UpdateLibraryInput,
    ) -> Result<LibraryGql> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        let banner = normalize_library_banner_index(input.banner_index);
        let custom_patch = input
            .custom_library_banner_id
            .map(|id| if id > 0 { Some(id as i64) } else { None });
        let row = update_library(
            &state.pool,
            user.id,
            id as i64,
            &input.name,
            &input.path,
            &input.library_type,
            banner,
            custom_patch,
        )
        .await?
        .ok_or_else(|| async_graphql::Error::new("library not found"))?;
        Ok(LibraryGql(row))
    }

    async fn delete_library(&self, ctx: &Context<'_>, id: i32) -> Result<bool> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        delete_library_owned(&state.pool, user.id, id as i64)
            .await
            .map_err(async_graphql::Error::from)
    }

    async fn sync_library_from_disk(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "libraryId")] library_id: i32,
    ) -> Result<Vec<BookGql>> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        let lib = crate::db::library_for_user(&state.pool, user.id, library_id as i64).await?;
        if lib.is_none() {
            return Err(async_graphql::Error::new("library not found"));
        }
        let rows = sync_library_books_from_disk(&state.pool, library_id as i64)
            .await
            .map_err(async_graphql::Error::new)?;
        Ok(rows.into_iter().map(BookGql).collect())
    }
}