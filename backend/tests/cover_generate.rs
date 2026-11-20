use std::path::PathBuf;

use nookline_backend::services::cover_generate::try_generate_cover_webp;

#[tokio::test]
async fn try_generate_cover_missing_pdf_returns_err() {
    let dir = tempfile::tempdir().expect("tmpdir");
    let missing = dir.path().join("missing.pdf");
    let out = dir.path().join("o.webp");
    let r = try_generate_cover_webp(&missing, ".pdf", &out).await;
    assert!(r.is_err());
}

#[tokio::test]
async fn try_generate_cover_missing_epub_returns_err() {
    let dir = tempfile::tempdir().expect("tmpdir");
    let missing = dir.path().join("nope.epub");
    let out = dir.path().join("o.webp");
    let r = try_generate_cover_webp(&missing, ".epub", &out).await;
    assert!(r.is_err());
}

#[tokio::test]
async fn try_generate_cover_minimal_pdf_when_pdftoppm_available() {
    if std::process::Command::new("pdftoppm")
        .arg("-v")
        .output()
        .is_err()
    {
        return;
    }
    let dir = tempfile::tempdir().expect("tmpdir");
    let pdf = dir.path().join("p.pdf");
    std::fs::write(
        &pdf,
        br#"%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj
trailer<</Root 1 0 R>>
%%EOF
"#,
    )
    .expect("pdf");
    let out = dir.path().join("out.webp");
    try_generate_cover_webp(&pdf, ".pdf", &out)
        .await
        .expect("cover");
    assert!(out.exists());
    assert!(std::fs::metadata(&out).expect("meta").len() > 0);
}

#[tokio::test]
async fn try_generate_cover_unsupported_ext() {
    let dir = tempfile::tempdir().expect("tmpdir");
    let f = dir.path().join("x.txt");
    std::fs::write(&f, b"x").expect("write");
    let out = dir.path().join("o.webp");
    let r = try_generate_cover_webp(&f, ".txt", &out).await;
    assert!(r.is_err());
    let _ = PathBuf::from(".");
}
