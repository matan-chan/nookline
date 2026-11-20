use async_graphql::{Context, InputObject, Object, Result};

use crate::db::{add_bookmark, add_highlight, delete_bookmark, delete_highlight};
use crate::gql::extra_types::{BookmarkGql, HighlightGql};
use crate::gql::types::require_user;
use crate::services::library_disk_sync::assert_book_readable;
use crate::state::AppState;

#[derive(Default)]
pub struct SocialMutation;

#[derive(InputObject)]
pub struct AddBookmarkInput {
    #[graphql(name = "userId")]
    pub user_id: i32,
    #[graphql(name = "bookId")]
    pub book_id: i32,
    pub position: String,
    pub note: Option<String>,
}

#[derive(InputObject)]
pub struct AddHighlightInput {
    #[graphql(name = "userId")]
    pub user_id: i32,
    #[graphql(name = "bookId")]
    pub book_id: i32,
    #[graphql(name = "startPos")]
    pub start_pos: String,
    #[graphql(name = "endPos")]
    pub end_pos: String,
    pub text: String,
    pub color: Option<String>,
}

#[Object]
impl SocialMutation {
    async fn add_bookmark(
        &self,
        ctx: &Context<'_>,
        input: AddBookmarkInput,
    ) -> Result<BookmarkGql> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        if input.user_id != user.id as i32 {
            return Err(async_graphql::Error::new("Forbidden"));
        }
        assert_book_readable(&state.pool, user.id, input.book_id as i64)
            .await
            .map_err(async_graphql::Error::new)?;
        let row = add_bookmark(
            &state.pool,
            user.id,
            input.book_id as i64,
            &input.position,
            input.note,
        )
        .await?;
        Ok(BookmarkGql::from(row))
    }

    async fn delete_bookmark(&self, ctx: &Context<'_>, id: i32) -> Result<bool> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        delete_bookmark(&state.pool, user.id, id as i64)
            .await
            .map_err(async_graphql::Error::from)
    }

    async fn add_highlight(
        &self,
        ctx: &Context<'_>,
        input: AddHighlightInput,
    ) -> Result<HighlightGql> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        if input.user_id != user.id as i32 {
            return Err(async_graphql::Error::new("Forbidden"));
        }
        assert_book_readable(&state.pool, user.id, input.book_id as i64)
            .await
            .map_err(async_graphql::Error::new)?;
        let row = add_highlight(
            &state.pool,
            user.id,
            input.book_id as i64,
            &input.start_pos,
            &input.end_pos,
            &input.text,
            input.color.as_deref(),
        )
        .await?;
        Ok(HighlightGql::from(row))
    }

    async fn delete_highlight(&self, ctx: &Context<'_>, id: i32) -> Result<bool> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        delete_highlight(&state.pool, user.id, id as i64)
            .await
            .map_err(async_graphql::Error::from)
    }
}
