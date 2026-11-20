use crate::util::paths::strip_windows_verbatim_path;

pub fn resolve_book_file_ext(file_path: &str, metadata: Option<&str>) -> Option<String> {
    let p = strip_windows_verbatim_path(file_path);
    let ext = p
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.trim_start_matches('.').to_ascii_lowercase())
        .unwrap_or_default();
    if ext == "pdf" || ext == "epub" {
        return Some(ext);
    }
    file_ext_from_metadata(metadata)
}

fn file_ext_from_metadata(metadata: Option<&str>) -> Option<String> {
    let raw = metadata?;
    let v: serde_json::Value = serde_json::from_str(raw).ok()?;
    let x = v
        .get("fileExt")
        .and_then(|e| e.as_str())?
        .trim()
        .trim_start_matches('.')
        .to_ascii_lowercase();
    if x == "pdf" || x == "epub" {
        return Some(x);
    }
    None
}
