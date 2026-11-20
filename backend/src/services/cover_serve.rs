use std::io::Cursor;
use std::path::{Path, PathBuf};

use axum::http::StatusCode;
use image::imageops::FilterType;
use image::GenericImageView;
use image::{ImageFormat, ImageReader};

use crate::util::paths::cover_cache_dir;

const DEFAULT_COVER_WIDTH: u32 = 560;
const COVER_WIDTH_STEPS: [u32; 5] = [128, 192, 256, 384, 560];

pub fn parse_cover_width(w: Option<&str>, width: Option<&str>) -> u32 {
    let raw = w.or(width);
    let Some(s) = raw else {
        return DEFAULT_COVER_WIDTH;
    };
    let Ok(n) = s.parse::<u32>() else {
        return DEFAULT_COVER_WIDTH;
    };
    if COVER_WIDTH_STEPS.contains(&n) {
        n
    } else {
        DEFAULT_COVER_WIDTH
    }
}

fn encode_webp(img: image::DynamicImage) -> Result<Vec<u8>, String> {
    let mut buf = Cursor::new(Vec::new());
    img.write_to(&mut buf, ImageFormat::WebP)
        .map_err(|e| e.to_string())?;
    Ok(buf.into_inner())
}

fn resize_image(img: image::DynamicImage, target_width: u32) -> image::DynamicImage {
    let (w, h) = img.dimensions();
    if w <= target_width {
        return img;
    }
    let nh = (h as f32 * (target_width as f32 / w as f32)).round() as u32;
    img.resize(target_width, nh.max(1), FilterType::Lanczos3)
}

fn resize_path_to_webp(src: &Path, target_width: u32) -> Result<Vec<u8>, String> {
    let img = ImageReader::open(src)
        .map_err(|e| e.to_string())?
        .decode()
        .map_err(|e| e.to_string())?;
    encode_webp(resize_image(img, target_width))
}

fn resize_bytes_to_webp(bytes: &[u8], target_width: u32) -> Result<Vec<u8>, String> {
    let img = image::load_from_memory(bytes).map_err(|e| e.to_string())?;
    encode_webp(resize_image(img, target_width))
}

fn raster_ext(path: &Path) -> bool {
    let Some(ext) = path.extension().and_then(|e| e.to_str()) else {
        return false;
    };
    matches!(
        ext.to_ascii_lowercase().as_str(),
        "jpg" | "jpeg" | "png" | "webp" | "gif" | "tiff" | "tif" | "avif"
    )
}

fn cache_path(cache_dir: &Path, base: &str, width: u32) -> PathBuf {
    cache_dir.join(format!("{base}-w{width}.webp"))
}

async fn file_is_stale(cache: &Path, src: &Path) -> bool {
    match (
        tokio::fs::metadata(cache).await,
        tokio::fs::metadata(src).await,
    ) {
        (Ok(c), Ok(s)) => c.modified().ok() < s.modified().ok(),
        (Err(_), Ok(_)) => true,
        _ => true,
    }
}

pub async fn serve_optimized_local_cover(
    src_path: &Path,
    cache_base: &str,
    target_width: u32,
) -> Result<Vec<u8>, CoverServeError> {
    if !raster_ext(src_path) {
        return Err(CoverServeError::Unsupported);
    }
    if !src_path.exists() {
        return Err(CoverServeError::NotFound);
    }
    let cache_dir = cover_cache_dir();
    tokio::fs::create_dir_all(&cache_dir).await.ok();
    let out_path = cache_path(&cache_dir, cache_base, target_width);
    if file_is_stale(&out_path, src_path).await {
        let src = src_path.to_path_buf();
        let out = out_path.clone();
        let w = target_width;
        match tokio::task::spawn_blocking({
            let src = src.clone();
            move || resize_path_to_webp(&src, w)
        })
        .await
        {
            Ok(Ok(bytes)) => {
                tokio::fs::write(&out, &bytes)
                    .await
                    .map_err(|e| CoverServeError::Other(e.to_string()))?;
                return Ok(bytes);
            }
            _ => {
                let raw = tokio::fs::read(src_path)
                    .await
                    .map_err(|_| CoverServeError::NotFound)?;
                return Ok(raw);
            }
        }
    }
    tokio::fs::read(&out_path)
        .await
        .map_err(|_| CoverServeError::NotFound)
}

async fn fetch_ol_jpg(ol_id: i64) -> Result<Vec<u8>, CoverServeError> {
    let url = format!("https://covers.openlibrary.org/b/id/{ol_id}-L.jpg");
    let client = reqwest::Client::new();
    let res = client
        .get(url)
        .send()
        .await
        .map_err(|e| CoverServeError::Upstream(e.to_string()))?;
    if res.status() == StatusCode::NOT_FOUND {
        return Err(CoverServeError::NotFound);
    }
    if !res.status().is_success() {
        return Err(CoverServeError::Upstream(format!("HTTP {}", res.status())));
    }
    Ok(res
        .bytes()
        .await
        .map_err(|e| CoverServeError::Upstream(e.to_string()))?
        .to_vec())
}

pub async fn serve_optimized_ol_cover(
    ol_id: i64,
    target_width: u32,
) -> Result<Vec<u8>, CoverServeError> {
    let cache_dir = cover_cache_dir();
    tokio::fs::create_dir_all(&cache_dir).await.ok();
    let master_path = cache_dir.join(format!("ol-{ol_id}-src.webp"));
    let out_path = cache_path(&cache_dir, &format!("ol-{ol_id}"), target_width);
    let max_age = std::time::Duration::from_secs(60 * 60 * 24 * 30);
    let master_stale = match tokio::fs::metadata(&master_path).await {
        Ok(m) => m
            .modified()
            .ok()
            .and_then(|t| t.elapsed().ok())
            .is_none_or(|e| e > max_age),
        Err(_) => true,
    };
    if master_stale {
        let jpg = fetch_ol_jpg(ol_id).await?;
        let master = master_path.clone();
        tokio::task::spawn_blocking(move || {
            let webp = resize_bytes_to_webp(&jpg, DEFAULT_COVER_WIDTH)?;
            std::fs::write(&master, webp).map_err(|e| e.to_string())
        })
        .await
        .map_err(|e| CoverServeError::Other(e.to_string()))?
        .map_err(CoverServeError::Other)?;
    }
    if file_is_stale(&out_path, &master_path).await {
        let master = master_path.clone();
        let out = out_path.clone();
        let w = target_width;
        tokio::task::spawn_blocking(move || {
            let webp = resize_path_to_webp(&master, w)?;
            std::fs::write(&out, webp).map_err(|e| e.to_string())
        })
        .await
        .map_err(|e| CoverServeError::Other(e.to_string()))?
        .map_err(CoverServeError::Other)?;
    }
    tokio::fs::read(&out_path)
        .await
        .map_err(|_| CoverServeError::NotFound)
}

#[derive(Debug)]
pub enum CoverServeError {
    NotFound,
    Unsupported,
    Upstream(String),
    Other(String),
}

pub fn cover_bytes_mime(bytes: &[u8], src_path: &Path) -> &'static str {
    if bytes.len() >= 12 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        return "image/webp";
    }
    let ext = src_path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| format!(".{}", e.to_ascii_lowercase()))
        .unwrap_or_default();
    mime_for_upload_ext(&ext)
}

pub fn mime_for_upload_ext(ext: &str) -> &'static str {
    match ext {
        ".epub" => "application/epub+zip",
        ".pdf" => "application/pdf",
        ".jpg" | ".jpeg" => "image/jpeg",
        ".png" => "image/png",
        ".webp" => "image/webp",
        ".ico" => "image/x-icon",
        ".svg" => "image/svg+xml",
        _ => "application/octet-stream",
    }
}