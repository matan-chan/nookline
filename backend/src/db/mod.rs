mod sql_datetime;

mod book;
mod book_ops;
mod customization;
mod customization_mut;
mod library;
mod reading;
mod series;
mod series_ops;
mod tts_user;
mod voice_profile;

pub use book::{book_for_user, books_for_library, recently_added_for_user, BookRow};
pub use book_ops::{
    assert_library_owned, create_book_record, delete_book_for_user, favorite_books_for_user,
    load_existing_file_path_keys, recommended_books_for_user, CreateBookInput,
};
pub use customization::{load_app_customization, AppCustomizationView};
pub use customization_mut::{reset_app_customization, update_app_site_name, update_pdf_conversion};
pub use library::{
    create_library, delete_library_owned, libraries_for_user, library_by_id, library_for_user,
    normalize_library_banner_index, random_library_banner_index, update_library, LibraryRow,
};
pub use reading::{
    add_bookmark, add_highlight, bookmarks_for_book, delete_bookmark, delete_highlight,
    highlights_for_book, is_book_favorite, on_deck_for_user, reading_progress_for_user_book,
    set_book_favorite, upsert_reading_progress, user_bookmarks, user_highlights, BookmarkRow,
    HighlightRow, ReadingProgressRow, UserBookmarkRow, UserHighlightRow,
};
pub use series::{series_for_library, SeriesRow};
pub use series_ops::{
    create_series, delete_series_for_user, series_for_user, series_list_for_user, CreateSeriesInput,
};
pub use tts_user::{load_tts_settings, update_tts_settings, UpdateTtsSettingsInput, TtsSettingsView};
pub use voice_profile::{
    create_voice_profile, delete_voice_profile, voice_profiles_for_user, VoiceProfileRow,
};