use async_graphql::{Context, Object, Result, SimpleObject};
use std::sync::Arc;

use crate::auth::AuthUser;
use crate::db::{
    books_for_library, is_book_favorite, library_for_user, reading_progress_for_user_book,
    series_for_library, BookRow, LibraryRow, SeriesRow,
};
use crate::gql::extra_types::ReadingProgressGql;
use crate::state::AppState;
use crate::util::file_ext::resolve_book_file_ext;

fn i32_id(id: i64) -> i32 {
    id.min(i32::MAX as i64).max(i32::MIN as i64) as i32
}

#[derive(SimpleObject, Clone)]
pub struct AuthUserGql {
    pub id: i32,
    pub username: String,
    #[graphql(name = "isAdmin")]
    pub is_admin: bool,
    #[graphql(name = "hasAvatar")]
    pub has_avatar: bool,
}

impl From<AuthUser> for AuthUserGql {
    fn from(u: AuthUser) -> Self {
        Self {
            id: i32_id(u.id),
            username: u.username,
            is_admin: u.is_admin,
            has_avatar: u.avatar_rel_path.is_some(),
        }
    }
}

#[derive(Clone)]
pub struct LibraryGql(pub LibraryRow);

#[Object]
impl LibraryGql {
    async fn id(&self) -> i32 {
        i32_id(self.0.id)
    }
    async fn name(&self) -> &str {
        &self.0.name
    }
    async fn path(&self) -> &str {
        &self.0.path
    }
    #[graphql(name = "type")]
    async fn library_type(&self) -> &str {
        &self.0.library_type
    }
    #[graphql(name = "bannerIndex")]
    async fn banner_index(&self) -> i32 {
        i32_id(self.0.banner_index)
    }
    #[graphql(name = "customLibraryBannerId")]
    async fn custom_library_banner_id(&self) -> Option<i32> {
        self.0.custom_library_banner_id.map(i32_id)
    }
    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> &str {
        &self.0.created_at
    }

    async fn series(&self, ctx: &Context<'_>) -> Result<Vec<SeriesGql>> {
        let state = ctx.data_unchecked::<AppState>();
        let rows = series_for_library(&state.pool, self.0.id).await?;
        Ok(rows.into_iter().map(SeriesGql).collect())
    }

    async fn books(&self, ctx: &Context<'_>) -> Result<Vec<BookGql>> {
        let state = ctx.data_unchecked::<AppState>();
        let rows = books_for_library(&state.pool, self.0.id).await?;
        Ok(rows.into_iter().map(BookGql).collect())
    }

    #[graphql(name = "previewBook")]
    async fn preview_book(&self, ctx: &Context<'_>) -> Result<Option<BookGql>> {
        let books = self.books(ctx).await?;
        Ok(books.into_iter().max_by(|a, b| a.0.created_at.cmp(&b.0.created_at)))
    }

    #[graphql(name = "previewBooks")]
    async fn preview_books(
        &self,
        ctx: &Context<'_>,
        #[graphql(default = 3)] limit: Option<i32>,
    ) -> Result<Vec<BookGql>> {
        let cap = limit
            .unwrap_or(3)
            .clamp(1, 5) as usize;
        let mut books = self.books(ctx).await?;
        books.sort_by(|a, b| b.0.created_at.cmp(&a.0.created_at));
        books.truncate(cap);
        Ok(books)
    }
}

#[derive(Clone)]
pub struct SeriesGql(pub SeriesRow);

#[Object]
impl SeriesGql {
    async fn id(&self) -> i32 {
        i32_id(self.0.id)
    }
    #[graphql(name = "libraryId")]
    async fn library_id(&self) -> i32 {
        i32_id(self.0.library_id)
    }
    async fn title(&self) -> &str {
        &self.0.title
    }
    async fn description(&self) -> Option<&str> {
        self.0.description.as_deref()
    }
    #[graphql(name = "coverImagePath")]
    async fn cover_image_path(&self) -> Option<&str> {
        self.0.cover_image_path.as_deref()
    }
    async fn metadata(&self) -> Option<&str> {
        self.0.metadata.as_deref()
    }
    async fn status(&self) -> &str {
        &self.0.status
    }
    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> &str {
        &self.0.created_at
    }

    async fn library(&self, ctx: &Context<'_>) -> Result<LibraryGql> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        let lib = library_for_user(&state.pool, user.id, self.0.library_id)
            .await?
            .ok_or_else(|| async_graphql::Error::new("Library not found for series"))?;
        Ok(LibraryGql(lib))
    }

    async fn books(&self, ctx: &Context<'_>) -> Result<Vec<BookGql>> {
        let state = ctx.data_unchecked::<AppState>();
        let rows = books_for_library(&state.pool, self.0.library_id).await?;
        Ok(rows
            .into_iter()
            .filter(|b| b.series_id == Some(self.0.id))
            .map(BookGql)
            .collect())
    }
}

#[derive(Clone)]
pub struct BookGql(pub BookRow);

#[Object]
impl BookGql {
    async fn id(&self) -> i32 {
        i32_id(self.0.id)
    }
    #[graphql(name = "libraryId")]
    async fn library_id(&self) -> i32 {
        i32_id(self.0.library_id)
    }
    #[graphql(name = "seriesId")]
    async fn series_id(&self) -> Option<i32> {
        self.0.series_id.map(i32_id)
    }
    async fn title(&self) -> &str {
        &self.0.title
    }
    #[graphql(name = "filePath")]
    async fn file_path(&self) -> &str {
        &self.0.file_path
    }
    #[graphql(name = "fileExt")]
    async fn file_ext(&self) -> Option<String> {
        resolve_book_file_ext(&self.0.file_path, self.0.metadata.as_deref())
    }
    #[graphql(name = "coverImagePath")]
    async fn cover_image_path(&self) -> Option<&str> {
        self.0.cover_image_path.as_deref()
    }
    #[graphql(name = "volumeNumber")]
    async fn volume_number(&self) -> Option<f64> {
        self.0.volume_number
    }
    async fn metadata(&self) -> Option<&str> {
        self.0.metadata.as_deref()
    }
    #[graphql(name = "createdAt")]
    async fn created_at(&self) -> &str {
        &self.0.created_at
    }

    async fn library(&self, ctx: &Context<'_>) -> Result<LibraryGql> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        let lib = library_for_user(&state.pool, user.id, self.0.library_id)
            .await?
            .ok_or_else(|| async_graphql::Error::new("Library not found for book"))?;
        Ok(LibraryGql(lib))
    }

    async fn series(&self, ctx: &Context<'_>) -> Result<Option<SeriesGql>> {
        let Some(series_id) = self.0.series_id else {
            return Ok(None);
        };
        let state = ctx.data_unchecked::<AppState>();
        let rows = series_for_library(&state.pool, self.0.library_id).await?;
        Ok(rows.into_iter().find(|s| s.id == series_id).map(SeriesGql))
    }

    #[graphql(name = "readingProgressForUser")]
    async fn reading_progress_for_user(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "userId")] user_id: i32,
    ) -> Result<Option<ReadingProgressGql>> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        if user_id != user.id as i32 {
            return Ok(None);
        }
        let row = reading_progress_for_user_book(&state.pool, user.id, self.0.id).await?;
        Ok(row.map(ReadingProgressGql::from))
    }

    #[graphql(name = "isFavoriteForUser")]
    async fn is_favorite_for_user(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "userId")] user_id: i32,
    ) -> Result<bool> {
        let state = ctx.data_unchecked::<AppState>();
        let user = require_user(ctx)?;
        if user_id != user.id as i32 {
            return Ok(false);
        }
        is_book_favorite(&state.pool, user.id, self.0.id)
            .await
            .map_err(async_graphql::Error::from)
    }
}

pub fn require_user(ctx: &Context<'_>) -> Result<Arc<AuthUser>> {
    ctx.data::<Option<Arc<AuthUser>>>()?
        .clone()
        .ok_or_else(|| async_graphql::Error::new("Forbidden"))
}

pub fn require_admin(ctx: &Context<'_>) -> Result<Arc<AuthUser>> {
    let user = require_user(ctx)?;
    if !user.is_admin {
        return Err(async_graphql::Error::new("Forbidden"));
    }
    Ok(user)
}