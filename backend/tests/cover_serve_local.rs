use std::path::PathBuf;

use image::ImageFormat;
use nookline_backend::services::cover_serve::{
    cover_bytes_mime, parse_cover_width, serve_optimized_local_cover,
};

fn tiny_jpeg_bytes() -> Vec<u8> {
    let img = image::RgbImage::from_pixel(32, 32, image::Rgb([200, 100, 50]));
    let mut buf = std::io::Cursor::new(Vec::new());
    img.write_to(&mut buf, ImageFormat::Jpeg).expect("jpeg");
    buf.into_inner()
}

#[tokio::test]
async fn serve_optimized_local_cover_jpeg_produces_webp() {
    let dir = tempfile::tempdir().expect("tmpdir");
    let src = dir.path().join("cover.jpg");
    std::fs::write(&src, tiny_jpeg_bytes()).expect("write");
    let bytes = serve_optimized_local_cover(&src, "test-cover-jpeg", 256)
        .await
        .expect("serve");
    assert!(!bytes.is_empty());
    assert_eq!(cover_bytes_mime(&bytes, &src), "image/webp");
}

#[tokio::test]
async fn serve_optimized_local_cover_unsupported_ext() {
    let dir = tempfile::tempdir().expect("tmpdir");
    let src = dir.path().join("book.pdf");
    std::fs::write(&src, b"%PDF").expect("write");
    let r = serve_optimized_local_cover(&src, "x", 256).await;
    assert!(matches!(
        r,
        Err(nookline_backend::services::cover_serve::CoverServeError::Unsupported)
    ));
}

#[test]
fn parse_cover_width_steps() {
    assert_eq!(parse_cover_width(Some("256"), None), 256);
    assert_eq!(parse_cover_width(Some("999"), None), 560);
    assert_eq!(parse_cover_width(None, None), 560);
    let _ = PathBuf::from(".");
}
