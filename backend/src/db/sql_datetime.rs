pub const NORMALIZE_CREATED_AT: &str =
    "CASE WHEN typeof(createdAt) = 'integer' THEN datetime(createdAt / 1000, 'unixepoch') ELSE createdAt END";

pub const NORMALIZE_UPDATED_AT: &str =
    "CASE WHEN typeof(updatedAt) = 'integer' THEN datetime(updatedAt / 1000, 'unixepoch') ELSE updatedAt END";

pub const NORMALIZE_CREATED_AT_BOOK: &str =
    "CASE WHEN typeof(Book.createdAt) = 'integer' THEN datetime(Book.createdAt / 1000, 'unixepoch') ELSE Book.createdAt END";

pub const NORMALIZE_UPDATED_AT_READING: &str =
    "CASE WHEN typeof(ReadingProgress.updatedAt) = 'integer' THEN datetime(ReadingProgress.updatedAt / 1000, 'unixepoch') ELSE ReadingProgress.updatedAt END";

pub const NORMALIZE_CREATED_AT_BOOKMARK: &str =
    "CASE WHEN typeof(Bookmark.createdAt) = 'integer' THEN datetime(Bookmark.createdAt / 1000, 'unixepoch') ELSE Bookmark.createdAt END";

pub const NORMALIZE_CREATED_AT_HIGHLIGHT: &str =
    "CASE WHEN typeof(Highlight.createdAt) = 'integer' THEN datetime(Highlight.createdAt / 1000, 'unixepoch') ELSE Highlight.createdAt END";
