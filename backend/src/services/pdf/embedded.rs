use std::path::Path;
use std::process::Command;

const MAX_BYTES: u64 = 40 * 1024 * 1024;

pub struct PdfEmbeddedMeta {
    pub title: Option<String>,
    pub author: Option<String>,
}

fn clean_meta(raw: &str) -> Option<String> {
    let t = raw.replace('\0', "").split_whitespace().collect::<Vec<_>>().join(" ");
    if t.is_empty() {
        None
    } else {
        Some(t)
    }
}

fn pdfinfo_field(path: &Path, key: &str) -> Option<String> {
    let out = Command::new("pdfinfo").arg(path).output().ok()?;
    if !out.status.success() {
        return None;
    }
    let prefix = format!("{key}:");
    for line in String::from_utf8_lossy(&out.stdout).lines() {
        if let Some(rest) = line.strip_prefix(&prefix) {
            return clean_meta(rest);
        }
    }
    None
}

pub fn extract_pdf_embedded_metadata(path: &Path, file_size: u64) -> PdfEmbeddedMeta {
    if file_size > MAX_BYTES {
        return PdfEmbeddedMeta {
            title: None,
            author: None,
        };
    }
    PdfEmbeddedMeta {
        title: pdfinfo_field(path, "Title"),
        author: pdfinfo_field(path, "Author"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn skips_oversized_files() {
        let out = extract_pdf_embedded_metadata(Path::new("/nope.pdf"), 50 * 1024 * 1024);
        assert!(out.title.is_none() && out.author.is_none());
    }

    #[test]
    fn reads_title_author_when_pdfinfo_available() {
        if std::process::Command::new("pdfinfo")
            .arg("-v")
            .output()
            .is_err()
        {
            return;
        }
        let dir = tempfile::tempdir().expect("tmpdir");
        let path = dir.path().join("m.pdf");
        let body = br#"%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj
4 0 obj<</Title(  My Title  )/Author(  Author Name  )>>endobj
trailer<</Root 1 0 R/Info 4 0 R>>
%%EOF
"#;
        std::fs::write(&path, body).expect("write pdf");
        let len = std::fs::metadata(&path).expect("meta").len();
        let out = extract_pdf_embedded_metadata(&path, len);
        assert_eq!(out.title.as_deref(), Some("My Title"));
        assert_eq!(out.author.as_deref(), Some("Author Name"));
    }
}