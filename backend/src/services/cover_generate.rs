use std::io::Read;
use std::path::Path;
use std::process::Command;

use image::GenericImageView;
use image::ImageFormat;
use zip::ZipArchive;

use crate::services::cover_serve::CoverServeError;

const COVER_MAX_W: u32 = 560;
const COVER_MAX_H: u32 = 800;
const MAX_PDF_BYTES: u64 = 120 * 1024 * 1024;

fn write_fit_webp(src: image::DynamicImage, out_path: &Path) -> Result<(), String> {
    let (w, h) = src.dimensions();
    let scaled = if w <= COVER_MAX_W && h <= COVER_MAX_H {
        src
    } else {
        let ratio = (COVER_MAX_W as f32 / w as f32).min(COVER_MAX_H as f32 / h as f32);
        let nw = (w as f32 * ratio).round() as u32;
        let nh = (h as f32 * ratio).round() as u32;
        src.resize(nw, nh.max(1), image::imageops::FilterType::Lanczos3)
    };
    scaled
        .save_with_format(out_path, ImageFormat::WebP)
        .map_err(|e| e.to_string())
}

fn pdf_via_pdftoppm(pdf: &Path, out_path: &Path) -> Result<(), String> {
    let tmp = std::env::temp_dir().join(format!("nookline-pdf-{}", std::process::id()));
    std::fs::create_dir_all(&tmp).map_err(|e| e.to_string())?;
    let prefix = tmp.join("p");
    let status = Command::new("pdftoppm")
        .args([
            "-png",
            "-f",
            "1",
            "-l",
            "1",
            "-r",
            "144",
            &pdf.to_string_lossy(),
            &prefix.to_string_lossy(),
        ])
        .status()
        .map_err(|e| e.to_string())?;
    if !status.success() {
        let _ = std::fs::remove_dir_all(&tmp);
        return Err("pdftoppm failed".to_string());
    }
    let png = std::fs::read_dir(&tmp)
        .ok()
        .into_iter()
        .flatten()
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .find(|p| p.extension().is_some_and(|x| x == "png"));
    let Some(png) = png else {
        let _ = std::fs::remove_dir_all(&tmp);
        return Err("no png from pdftoppm".to_string());
    };
    let img = image::open(&png).map_err(|e| e.to_string())?;
    let r = write_fit_webp(img, out_path);
    let _ = std::fs::remove_dir_all(&tmp);
    r
}

fn epub_cover_webp(epub: &Path, out_path: &Path) -> Result<(), String> {
    let file = std::fs::File::open(epub).map_err(|e| e.to_string())?;
    let mut zip = ZipArchive::new(file).map_err(|e| e.to_string())?;
    let container = zip
        .by_name("META-INF/container.xml")
        .map_err(|e| e.to_string())?;
    let mut cx = String::new();
    container.take(1024 * 512).read_to_string(&mut cx).ok();
    let root = regex::Regex::new(r#"full-path\s*=\s*["']([^"']+)["']"#)
        .ok()
        .and_then(|re| re.captures(&cx))
        .and_then(|c| {
            c.get(1)
                .map(|m| m.as_str().trim_start_matches('/').to_string())
        });
    let Some(opf_path) = root else {
        return Err("no opf in epub".to_string());
    };
    let href = {
        let mut opf_file = zip.by_name(&opf_path).map_err(|e| e.to_string())?;
        let mut opf = String::new();
        opf_file
            .read_to_string(&mut opf)
            .map_err(|e| e.to_string())?;
        opf_cover_href(&opf).ok_or_else(|| "no cover href".to_string())?
    };
    let img_rel = crate::services::epub::zip_paths::resolve_zip_path(&opf_path, &href);
    let mut img_entry = zip
        .by_name(&img_rel)
        .map_err(|_| "cover image missing in epub")?;
    let mut buf = Vec::new();
    img_entry.read_to_end(&mut buf).map_err(|e| e.to_string())?;
    let image = image::load_from_memory(&buf).map_err(|e| e.to_string())?;
    write_fit_webp(image, out_path)
}

fn opf_cover_href(opf: &str) -> Option<String> {
    if let Some(prop) =
        regex::Regex::new(r#"<item\b[^>]*properties\s*=\s*["'][^"']*cover-image[^"']*["'][^>]*/?>"#)
            .ok()
            .and_then(|re| re.find(opf))
    {
        if let Some(h) = regex::Regex::new(r#"\bhref\s*=\s*["']([^"']+)["']"#)
            .ok()
            .and_then(|re| re.captures(prop.as_str()))
            .and_then(|c| c.get(1).map(|m| m.as_str().to_string()))
        {
            return Some(h);
        }
    }
    let cover_meta = regex::Regex::new(
        r#"<meta\b[^>]*name\s*=\s*["']cover["'][^>]*content\s*=\s*["']([^"']+)["']"#,
    )
    .ok()
    .and_then(|re| re.captures(opf))
    .and_then(|c| c.get(1).map(|m| m.as_str().to_string()));
    if let Some(id) = cover_meta {
        if let Some(h) = item_href_by_id(opf, &id) {
            return Some(h);
        }
    }
    let item_re =
        regex::Regex::new(r#"<item\b[^>]*href\s*=\s*["']([^"']+\.(?:jpe?g|png|webp))["'][^>]*/?>"#)
            .ok()?;
    for cap in item_re.captures_iter(opf) {
        let block = cap.get(0).map(|m| m.as_str()).unwrap_or("");
        let href = cap.get(1).map(|m| m.as_str()).unwrap_or("");
        if block.to_ascii_lowercase().contains("cover")
            || href.to_ascii_lowercase().contains("cover")
        {
            return Some(href.to_string());
        }
    }
    None
}

fn item_href_by_id(opf: &str, item_id: &str) -> Option<String> {
    let pat = format!(
        r#"<item\b[^>]*id\s*=\s*["']{}["'][^>]*/?>"#,
        regex::escape(item_id)
    );
    let re = regex::Regex::new(&pat).ok()?;
    let m = re.find(opf)?;
    regex::Regex::new(r#"\bhref\s*=\s*["']([^"']+)["']"#)
        .ok()
        .and_then(|re| re.captures(m.as_str()))
        .and_then(|c| c.get(1).map(|x| x.as_str().to_string()))
}

pub async fn try_generate_cover_webp(
    file_path: &Path,
    ext: &str,
    out_path: &Path,
) -> Result<(), CoverServeError> {
    let ext = ext.to_ascii_lowercase();
    tokio::task::spawn_blocking({
        let file_path = file_path.to_path_buf();
        let out_path = out_path.to_path_buf();
        let ext = ext.clone();
        move || {
            if ext == ".pdf" {
                let meta = std::fs::metadata(&file_path)
                    .map_err(|e| CoverServeError::Other(e.to_string()))?;
                if meta.len() > MAX_PDF_BYTES {
                    return Err(CoverServeError::Other("pdf too large".to_string()));
                }
                pdf_via_pdftoppm(&file_path, &out_path).map_err(CoverServeError::Other)?;
                return Ok(());
            }
            if ext == ".epub" {
                epub_cover_webp(&file_path, &out_path).map_err(CoverServeError::Other)?;
                return Ok(());
            }
            Err(CoverServeError::Unsupported)
        }
    })
    .await
    .map_err(|e| CoverServeError::Other(e.to_string()))?
}
