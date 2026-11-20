use crate::util::paths::{resolve_library_content_dir, upload_base_dir};

pub fn remove_library_disk_folder_if_safe(library_path: &str) {
    let trimmed = library_path.trim();
    if trimmed.is_empty() {
        return;
    }
    let base = upload_base_dir();
    let root = resolve_library_content_dir(&base, trimmed);
    if !root.exists() {
        return;
    }
    let Ok(meta) = std::fs::metadata(&root) else {
        return;
    };
    if !meta.is_dir() {
        return;
    }
    let Ok(base_abs) = base.canonicalize() else {
        return;
    };
    let Ok(root_abs) = root.canonicalize() else {
        return;
    };
    if root_abs == base_abs {
        return;
    }
    if !root_abs.starts_with(&base_abs) {
        return;
    }
    let _ = std::fs::remove_dir_all(root_abs);
}
