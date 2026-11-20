use std::path::PathBuf;

use crate::util::paths::{cover_cache_dir, resolve_book_file_on_disk, resolve_library_cover_cache_dir};

const DERIVED_COVER_PREFIX: &str = "derived-cover-";

pub struct BookDiskArtifactInput {
    pub id: i64,
    pub file_path: String,
    pub cover_image_path: Option<String>,
    pub library_path: String,
}

pub fn unlink_book_disk_artifacts(book: &BookDiskArtifactInput) {
    let main = resolve_book_file_on_disk(&book.library_path, &book.file_path);
    safe_unlink(&main);
    if let Some(ref cov) = book.cover_image_path {
        safe_unlink_path(cov);
    }
    let derived = resolve_library_cover_cache_dir(&book.library_path)
        .join(format!("{DERIVED_COVER_PREFIX}{}.webp", book.id));
    safe_unlink(&derived);
    let global_cache = cover_cache_dir().join(format!("book-{}-w560.webp", book.id));
    safe_unlink(&global_cache);
    let cache_dir = cover_cache_dir();
    if let Ok(read) = std::fs::read_dir(&cache_dir) {
        for ent in read.flatten() {
            let name = ent.file_name().to_string_lossy().to_string();
            if name.starts_with(&format!("book-{}", book.id)) {
                safe_unlink(&ent.path());
            }
        }
    }
}

fn safe_unlink(path: &std::path::Path) {
    if !path.exists() {
        return;
    }
    let _ = std::fs::remove_file(path);
}

fn safe_unlink_path(raw: &str) {
    let t = raw.trim();
    if t.is_empty() {
        return;
    }
    safe_unlink(PathBuf::from(t).as_path());
}