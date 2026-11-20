use std::path::Path;

use axum::body::Body;
use axum::http::{header, HeaderMap, StatusCode};
use axum::response::Response;
use tokio::fs::File;
use tokio::io::{AsyncReadExt, AsyncSeekExt};
use tokio_util::io::ReaderStream;

use crate::services::cover_serve::mime_for_upload_ext;

pub fn parse_single_byte_range(range_header: &str, file_size: u64) -> Option<(u64, u64)> {
    let raw = range_header.trim();
    let lower = raw.to_ascii_lowercase();
    if !lower.starts_with("bytes=") {
        return None;
    }
    let rest = &raw[6..];
    let first = rest.split(',').next()?.trim();
    if let Some(suffix) = first.strip_prefix('-') {
        let len: u64 = suffix.parse().ok()?;
        if len == 0 {
            return None;
        }
        let start = file_size.saturating_sub(len);
        return Some((start, file_size - 1));
    }
    let (a, b) = first.split_once('-')?;
    let mut start: u64 = if a.is_empty() { 0 } else { a.parse().ok()? };
    let mut end: u64 = if b.is_empty() {
        file_size.saturating_sub(1)
    } else {
        b.parse().ok()?
    };
    if file_size == 0 {
        return None;
    }
    start = start.min(file_size - 1);
    end = end.min(file_size - 1);
    if start > end {
        return None;
    }
    Some((start, end))
}

pub async fn stream_file_with_range(
    headers: &HeaderMap,
    abs: &Path,
) -> Result<Response, ()> {
    let meta = tokio::fs::metadata(abs).await.map_err(|_| ())?;
    let file_size = meta.len();
    let ext = abs
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| format!(".{}", e.to_lowercase()))
        .unwrap_or_default();
    let mime = mime_for_upload_ext(&ext);
    let range_hdr = headers.get(header::RANGE).and_then(|v| v.to_str().ok());
    let mut file = File::open(abs).await.map_err(|_| ())?;
    if let Some(range) = range_hdr {
        if file_size == 0 {
            return Ok(Response::builder()
                .status(StatusCode::RANGE_NOT_SATISFIABLE)
                .header(header::CONTENT_RANGE, "bytes */0")
                .body(Body::empty())
                .unwrap());
        }
        let Some((start, end)) = parse_single_byte_range(range, file_size) else {
            return Ok(Response::builder()
                .status(StatusCode::RANGE_NOT_SATISFIABLE)
                .header(header::CONTENT_RANGE, format!("bytes */{file_size}"))
                .body(Body::empty())
                .unwrap());
        };
        let chunk = end - start + 1;
        file.seek(std::io::SeekFrom::Start(start)).await.ok();
        let mut buf = vec![0u8; chunk as usize];
        file.read_exact(&mut buf).await.map_err(|_| ())?;
        let mut resp = Response::builder()
            .status(StatusCode::PARTIAL_CONTENT)
            .header(header::CONTENT_RANGE, format!("bytes {start}-{end}/{file_size}"))
            .header(header::ACCEPT_RANGES, "bytes")
            .header(header::CONTENT_LENGTH, chunk.to_string())
            .header(header::CONTENT_TYPE, mime);
        if ext == ".pdf" {
            resp = resp.header(header::CACHE_CONTROL, "private, no-transform");
        }
        return Ok(resp.body(Body::from(buf)).unwrap());
    }
    let stream = ReaderStream::new(file);
    let body = Body::from_stream(stream);
    let mut resp = Response::builder()
        .status(StatusCode::OK)
        .header(header::ACCEPT_RANGES, "bytes")
        .header(header::CONTENT_LENGTH, file_size.to_string())
        .header(header::CONTENT_TYPE, mime);
    if ext == ".pdf" {
        resp = resp.header(header::CACHE_CONTROL, "private, no-transform");
    }
    Ok(resp.body(body).unwrap())
}

pub async fn stream_bytes(body: Vec<u8>, content_type: &str, cache_control: &str) -> Response {
    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, content_type)
        .header(header::CACHE_CONTROL, cache_control)
        .header(header::CONTENT_LENGTH, body.len().to_string())
        .body(Body::from(body))
        .unwrap()
}

pub async fn stream_disk_image(abs: &Path, cache_control: &str) -> Result<Response, StatusCode> {
    if !abs.exists() {
        return Err(StatusCode::NOT_FOUND);
    }
    let ext = abs
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| format!(".{}", e.to_ascii_lowercase()))
        .unwrap_or_default();
    let mime = mime_for_upload_ext(&ext);
    let data = tokio::fs::read(abs).await.map_err(|_| StatusCode::NOT_FOUND)?;
    Ok(stream_bytes(data, mime, cache_control).await)
}