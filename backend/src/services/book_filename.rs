use std::path::Path;

#[derive(Clone, Default)]
pub struct FilenameInference {
    pub suggested_title: Option<String>,
    pub suggested_author: Option<String>,
}

pub struct FilenameInferenceBundle {
    pub slug: String,
    pub inferred: FilenameInference,
    pub repair_title: bool,
}

pub fn strip_upload_timestamp(file_path: &str) -> String {
    let base = Path::new(file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(file_path);
    let stem = regex::Regex::new(r"(?i)^\d+_(.+)$")
        .ok()
        .and_then(|re| re.captures(base))
        .and_then(|c| c.get(1).map(|m| m.as_str()))
        .unwrap_or(base);
    regex::Regex::new(r"(?i)\.(pdf|epub)$")
        .ok()
        .map(|re| re.replace(stem, "").to_string())
        .unwrap_or_else(|| stem.to_string())
        .trim()
        .to_string()
}

pub fn build_filename_inference(abs_file_path: &str, book_title: &str) -> FilenameInferenceBundle {
    let slug = strip_upload_timestamp(abs_file_path);
    let inferred = infer_from_filename_slug(&slug);
    let repair_title = title_looks_like_raw_filename(book_title, &slug);
    FilenameInferenceBundle {
        slug,
        inferred,
        repair_title,
    }
}

pub fn title_from_disk_path(abs_path: &str) -> String {
    let slug = strip_upload_timestamp(abs_path);
    let inferred = infer_from_filename_slug(&slug);
    let base = Path::new(abs_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("");
    let title = inferred
        .suggested_title
        .as_deref()
        .filter(|t| !t.is_empty())
        .unwrap_or(base);
    title.chars().take(500).collect()
}

pub fn infer_from_filename_slug(slug: &str) -> FilenameInference {
    let mut s = slug.replace('_', " ");
    s = regex::Regex::new(r"\s+")
        .ok()
        .map(|re| re.replace_all(&s, " ").to_string())
        .unwrap_or(s);
    let s = s.trim().to_string();
    if s.is_empty() {
        return FilenameInference::default();
    }
    if let Some(cap) = regex::Regex::new(r"(?i)^pg\s*(\d+)")
        .ok()
        .and_then(|re| re.captures(&s))
    {
        let n = cap.get(1).map(|m| m.as_str()).unwrap_or("");
        return FilenameInference {
            suggested_title: Some(format!("Project Gutenberg eBook #{n}")),
            suggested_author: None,
        };
    }
    let s = regex::Regex::new(r"(?i)\s+images\s+\d+\s*$")
        .ok()
        .map(|re| re.replace(&s, "").trim().to_string())
        .unwrap_or(s);
    if !s.contains(" - ") && !s.contains(" – ") && s.contains('-') {
        let compact = s.replace(' ', "");
        if let Some(g) = infer_from_catalog_hyphen_slug(&strip_leading_opaque_slug_prefix(&compact))
            .or_else(|| infer_from_catalog_hyphen_slug(&compact))
        {
            if g.suggested_author.is_some() && g.suggested_title.is_some() {
                return g;
            }
        }
    }
    if let Ok(re) = regex::Regex::new(r"(?i)^(.{2,80}?)\s*[-–—]\s+(.{2,200})$") {
        if let Some(cap) = re.captures(&s) {
            return FilenameInference {
                suggested_author: Some(cap.get(1).map(|m| m.as_str().trim()).unwrap_or("").to_string()),
                suggested_title: Some(cap.get(2).map(|m| m.as_str().trim()).unwrap_or("").to_string()),
            };
        }
    }
    if let Ok(re) = regex::Regex::new(r"(?i)^(.{2,200}?)\s+by\s+(.{2,80})$") {
        if let Some(cap) = re.captures(&s) {
            return FilenameInference {
                suggested_title: Some(cap.get(1).map(|m| m.as_str().trim()).unwrap_or("").to_string()),
                suggested_author: Some(cap.get(2).map(|m| m.as_str().trim()).unwrap_or("").to_string()),
            };
        }
    }
    if let Ok(re) = regex::Regex::new(r"^\[(.+?)\]\s*(.+)$") {
        if let Some(cap) = re.captures(&s) {
            if cap.get(2).map(|m| m.as_str().trim().len()).unwrap_or(0) > 2 {
                return FilenameInference {
                    suggested_author: Some(cap.get(1).map(|m| m.as_str().trim()).unwrap_or("").to_string()),
                    suggested_title: Some(cap.get(2).map(|m| m.as_str().trim()).unwrap_or("").to_string()),
                };
            }
        }
    }
    FilenameInference {
        suggested_title: Some(s),
        suggested_author: None,
    }
}

fn strip_leading_opaque_slug_prefix(slug: &str) -> String {
    let compact = slug.trim().replace(char::is_whitespace, "");
    if let Some(cap) = regex::Regex::new(r"(?i)^[a-z0-9]{8,}-\d+-(.+)$")
        .ok()
        .and_then(|re| re.captures(&compact))
    {
        if let Some(m) = cap.get(1) {
            return m.as_str().to_string();
        }
    }
    if let Some(cap) = regex::Regex::new(r"^\d+-(.+)$")
        .ok()
        .and_then(|re| re.captures(&compact))
    {
        if let Some(m) = cap.get(1) {
            return m.as_str().to_string();
        }
    }
    slug.trim().to_string()
}

fn infer_from_catalog_hyphen_slug(raw_slug: &str) -> Option<FilenameInference> {
    let slug = raw_slug.replace('_', "-").replace("--", "-");
    if !slug.contains('-') {
        return None;
    }
    let parts: Vec<&str> = slug.split('-').map(str::trim).filter(|p| !p.is_empty()).collect();
    if parts.len() < 3 {
        return None;
    }
    let author_len = if parts.len() >= 5 && author_particle(parts[parts.len() - 2]) {
        3
    } else {
        2
    };
    let title_parts = &parts[..parts.len().saturating_sub(author_len)];
    let author_parts = &parts[parts.len().saturating_sub(author_len)..];
    if title_parts.is_empty() || author_parts.is_empty() {
        return None;
    }
    Some(FilenameInference {
        suggested_title: Some(
            title_parts
                .iter()
                .map(|w| capitalize_word(w))
                .collect::<Vec<_>>()
                .join(" "),
        ),
        suggested_author: Some(
            author_parts
                .iter()
                .enumerate()
                .map(|(i, w)| format_author_word(w, i))
                .collect::<Vec<_>>()
                .join(" "),
        ),
    })
}

fn author_particle(w: &str) -> bool {
    matches!(
        w.to_ascii_lowercase().as_str(),
        "de" | "del" | "della" | "di" | "da" | "das" | "dos" | "du" | "der" | "den" | "la" | "le"
            | "les" | "el" | "van" | "von" | "st" | "ste" | "mac" | "mc"
    )
}

fn capitalize_word(w: &str) -> String {
    let mut chars = w.chars();
    let Some(c) = chars.next() else {
        return String::new();
    };
    format!("{}{}", c.to_uppercase(), chars.as_str().to_lowercase())
}

fn format_author_word(w: &str, idx: usize) -> String {
    if idx > 0 && author_particle(w) {
        w.to_ascii_lowercase()
    } else {
        capitalize_word(w)
    }
}

pub fn title_looks_like_raw_filename(title: &str, slug: &str) -> bool {
    let nt = normalize_loose(title);
    let ns = normalize_loose(slug);
    if nt == ns {
        return true;
    }
    if regex::Regex::new(r"(?i)^pg\s*\d")
        .ok()
        .is_some_and(|re| re.is_match(title))
    {
        return true;
    }
    if regex::Regex::new(r"(?i)\bimages\s+\d+\s*$")
        .ok()
        .is_some_and(|re| re.is_match(title))
    {
        return true;
    }
    title.trim().len() < 6 && slug.chars().filter(|c| c.is_ascii_alphanumeric()).count() > 8
}

fn normalize_loose(s: &str) -> String {
    regex::Regex::new(r"(?i)\.(pdf|epub)$")
        .ok()
        .map(|re| re.replace(s, "").to_string())
        .unwrap_or_else(|| s.to_string())
        .to_lowercase()
        .replace(['_', '-'], " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

pub fn metadata_json_for_ext(ext: &str) -> Option<String> {
    let e = ext.to_ascii_lowercase();
    if e == ".pdf" || e == ".epub" {
        Some(format!(r#"{{"fileExt":"{}"}}"#, e.trim_start_matches('.')))
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strip_upload_timestamp_cases() {
        assert_eq!(
            strip_upload_timestamp("/vol/1730000000000_My_Book.pdf"),
            "My_Book"
        );
        assert_eq!(strip_upload_timestamp("C:\\x\\1_file.epub"), "file");
        assert_eq!(strip_upload_timestamp("/plain.pdf"), "plain");
    }

    #[test]
    fn title_looks_like_raw_filename_cases() {
        assert!(title_looks_like_raw_filename("my_book", "my_book"));
        assert!(!title_looks_like_raw_filename("Pride and Prejudice", "random_slug"));
    }

    #[test]
    fn infer_catalog_slug() {
        let inf = infer_from_filename_slug(
            "cnzrj4sazlgn6spcwfw5l0az-0046-don-quixote-miguel-de-cervantes",
        );
        assert_eq!(inf.suggested_title.as_deref(), Some("Don Quixote"));
        assert_eq!(
            inf.suggested_author.as_deref(),
            Some("Miguel de Cervantes")
        );
    }

    #[test]
    fn infer_pg_pattern() {
        let inf = infer_from_filename_slug("pg1234");
        assert_eq!(
            inf.suggested_title.as_deref(),
            Some("Project Gutenberg eBook #1234")
        );
    }

    #[test]
    fn infer_by_author_patterns() {
        assert_eq!(
            infer_from_filename_slug("Doe - The Tale").suggested_author.as_deref(),
            Some("Doe")
        );
        assert_eq!(
            infer_from_filename_slug("The Tale by Jane").suggested_title.as_deref(),
            Some("The Tale")
        );
        let bracket = infer_from_filename_slug("[Doe] Story");
        assert_eq!(bracket.suggested_author.as_deref(), Some("Doe"));
        assert_eq!(bracket.suggested_title.as_deref(), Some("Story"));
    }
}