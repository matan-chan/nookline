use async_graphql::SimpleObject;

use crate::db::{
    AppCustomizationView, BookmarkRow, HighlightRow, ReadingProgressRow, TtsSettingsView,
    UserBookmarkRow, UserHighlightRow,
};

fn i32_id(id: i64) -> i32 {
    id.min(i32::MAX as i64).max(i32::MIN as i64) as i32
}

#[derive(SimpleObject, Clone)]
pub struct ReadingProgressGql {
    pub id: i32,
    #[graphql(name = "userId")]
    pub user_id: i32,
    #[graphql(name = "bookId")]
    pub book_id: i32,
    pub position: String,
    pub percentage: f64,
    #[graphql(name = "updatedAt")]
    pub updated_at: String,
}

impl From<ReadingProgressRow> for ReadingProgressGql {
    fn from(p: ReadingProgressRow) -> Self {
        Self {
            id: i32_id(p.id),
            user_id: i32_id(p.user_id),
            book_id: i32_id(p.book_id),
            position: p.position,
            percentage: p.percentage,
            updated_at: p.updated_at,
        }
    }
}

#[derive(SimpleObject, Clone)]
pub struct BookmarkGql {
    pub id: i32,
    #[graphql(name = "userId")]
    pub user_id: i32,
    #[graphql(name = "bookId")]
    pub book_id: i32,
    pub position: String,
    pub note: Option<String>,
    #[graphql(name = "createdAt")]
    pub created_at: String,
}

impl From<BookmarkRow> for BookmarkGql {
    fn from(b: BookmarkRow) -> Self {
        Self {
            id: i32_id(b.id),
            user_id: i32_id(b.user_id),
            book_id: i32_id(b.book_id),
            position: b.position,
            note: b.note,
            created_at: b.created_at,
        }
    }
}

#[derive(SimpleObject, Clone)]
pub struct HighlightGql {
    pub id: i32,
    #[graphql(name = "userId")]
    pub user_id: i32,
    #[graphql(name = "bookId")]
    pub book_id: i32,
    #[graphql(name = "startPos")]
    pub start_pos: String,
    #[graphql(name = "endPos")]
    pub end_pos: String,
    pub text: String,
    pub color: String,
    #[graphql(name = "createdAt")]
    pub created_at: String,
}

impl From<HighlightRow> for HighlightGql {
    fn from(h: HighlightRow) -> Self {
        Self {
            id: i32_id(h.id),
            user_id: i32_id(h.user_id),
            book_id: i32_id(h.book_id),
            start_pos: h.start_pos,
            end_pos: h.end_pos,
            text: h.text,
            color: h.color,
            created_at: h.created_at,
        }
    }
}

#[derive(SimpleObject, Clone)]
pub struct UserBookmarkGql {
    pub id: i32,
    #[graphql(name = "bookId")]
    pub book_id: i32,
    #[graphql(name = "bookTitle")]
    pub book_title: String,
    pub position: String,
    pub note: Option<String>,
    #[graphql(name = "createdAt")]
    pub created_at: String,
}

impl From<UserBookmarkRow> for UserBookmarkGql {
    fn from(b: UserBookmarkRow) -> Self {
        Self {
            id: i32_id(b.id),
            book_id: i32_id(b.book_id),
            book_title: b.book_title,
            position: b.position,
            note: b.note,
            created_at: b.created_at,
        }
    }
}

#[derive(SimpleObject, Clone)]
pub struct UserHighlightGql {
    pub id: i32,
    #[graphql(name = "bookId")]
    pub book_id: i32,
    #[graphql(name = "bookTitle")]
    pub book_title: String,
    #[graphql(name = "startPos")]
    pub start_pos: String,
    #[graphql(name = "endPos")]
    pub end_pos: String,
    pub text: String,
    pub color: String,
    #[graphql(name = "createdAt")]
    pub created_at: String,
}

impl From<UserHighlightRow> for UserHighlightGql {
    fn from(h: UserHighlightRow) -> Self {
        Self {
            id: i32_id(h.id),
            book_id: i32_id(h.book_id),
            book_title: h.book_title,
            start_pos: h.start_pos,
            end_pos: h.end_pos,
            text: h.text,
            color: h.color,
            created_at: h.created_at,
        }
    }
}

#[derive(SimpleObject, Clone)]
pub struct CustomLibraryBannerRefGql {
    pub id: i32,
    pub url: String,
}

#[derive(SimpleObject, Clone)]
pub struct AppCustomizationGql {
    #[graphql(name = "siteName")]
    pub site_name: String,
    #[graphql(name = "hasOverrides")]
    pub has_overrides: bool,
    #[graphql(name = "faviconUrl")]
    pub favicon_url: Option<String>,
    #[graphql(name = "customLibraryBanners")]
    pub custom_library_banners: Vec<CustomLibraryBannerRefGql>,
    #[graphql(name = "convertPdfToEpub")]
    pub convert_pdf_to_epub: bool,
}

impl From<AppCustomizationView> for AppCustomizationGql {
    fn from(v: AppCustomizationView) -> Self {
        Self {
            site_name: v.site_name,
            has_overrides: v.has_overrides,
            favicon_url: v.favicon_url,
            custom_library_banners: v
                .banners
                .into_iter()
                .map(|(id, url)| CustomLibraryBannerRefGql {
                    id: i32_id(id),
                    url,
                })
                .collect(),
            convert_pdf_to_epub: v.convert_pdf_to_epub,
        }
    }
}

#[derive(SimpleObject, Clone)]
pub struct TtsSettingsGql {
    pub mode: String,
    #[graphql(name = "customBaseUrl")]
    pub custom_base_url: Option<String>,
    #[graphql(name = "hasCustomApiKey")]
    pub has_custom_api_key: bool,
    pub voice: String,
    pub model: String,
    pub speed: f64,
    pub pitch: f64,
    #[graphql(name = "chunkMinChars")]
    pub chunk_min_chars: i32,
    #[graphql(name = "chunkMaxChars")]
    pub chunk_max_chars: i32,
    #[graphql(name = "chunkPeriodExtra")]
    pub chunk_period_extra: i32,
    #[graphql(name = "readerShowPage")]
    pub reader_show_page: bool,
    #[graphql(name = "readerShowTitle")]
    pub reader_show_title: bool,
    #[graphql(name = "readerStripPdfMargins")]
    pub reader_strip_pdf_margins: bool,
    #[graphql(name = "readerDarkDocument")]
    pub reader_dark_document: bool,
}

impl From<TtsSettingsView> for TtsSettingsGql {
    fn from(v: TtsSettingsView) -> Self {
        Self {
            mode: v.mode,
            custom_base_url: v.custom_base_url,
            has_custom_api_key: v.has_custom_api_key,
            voice: v.voice,
            model: v.model,
            speed: v.speed,
            pitch: v.pitch,
            chunk_min_chars: v.chunk_min_chars as i32,
            chunk_max_chars: v.chunk_max_chars as i32,
            chunk_period_extra: v.chunk_period_extra as i32,
            reader_show_page: v.reader_show_page,
            reader_show_title: v.reader_show_title,
            reader_strip_pdf_margins: v.reader_strip_pdf_margins,
            reader_dark_document: v.reader_dark_document,
        }
    }
}

#[derive(SimpleObject, Clone)]
pub struct TtsEngineProbeGql {
    pub ok: bool,
    pub error: Option<String>,
}

impl From<crate::db::VoiceProfileRow> for VoiceProfileGql {
    fn from(v: crate::db::VoiceProfileRow) -> Self {
        Self {
            id: i32_id(v.id),
            user_id: i32_id(v.user_id),
            name: v.name,
            model_id: v.model_id,
            speed: v.speed,
            pitch: v.pitch,
            is_default: v.is_default,
            created_at: v.created_at,
        }
    }
}

#[derive(SimpleObject, Clone)]
pub struct VoiceProfileGql {
    pub id: i32,
    #[graphql(name = "userId")]
    pub user_id: i32,
    pub name: String,
    #[graphql(name = "modelId")]
    pub model_id: String,
    pub speed: f64,
    pub pitch: f64,
    #[graphql(name = "isDefault")]
    pub is_default: bool,
    #[graphql(name = "createdAt")]
    pub created_at: String,
}

#[derive(SimpleObject, Clone)]
pub struct BookWithProgressGql {
    pub book: crate::gql::types::BookGql,
    pub progress: ReadingProgressGql,
}