use std::collections::{HashMap, HashSet};
use std::path::Path;
use std::process::Command;

use serde_json::{json, Value};
use sqlx::SqlitePool;

const HEAD_LINE_SLOTS: usize = 14;
const TAIL_LINE_SLOTS: usize = 14;
const MIN_PAGES_FOR_PATTERN: usize = 3;
const MIN_LINE_HITS: usize = 3;
const MIN_LINE_PAGE_FRACTION: f64 = 0.28;
const MAX_PAGES_SCAN: usize = 120;

struct MarginTally {
    sample: String,
    pages: HashSet<usize>,
}

pub fn infer_margin_strip_regexes_from_pdf(pdf: &Path) -> Option<Vec<String>> {
    let pages = extract_lines_per_page(pdf)?;
    if pages.len() < MIN_PAGES_FOR_PATTERN {
        return Some(vec![]);
    }
    let regexes = regexes_from_tallies(&collect_margin_tallies(&pages), pages.len());
    Some(regexes)
}

pub async fn infer_and_persist_pdf_margin_strip_regexes(pool: &SqlitePool, book_id: i64) {
    let row = sqlx::query_as::<_, BookPdfRow>(
        r#"SELECT b.id, b.metadata, b.filePath as file_path, l.path as library_path FROM Book b INNER JOIN Library l ON b.libraryId = l.id WHERE b.id = ?"#,
    )
    .bind(book_id)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten();
    let Some(row) = row else {
        return;
    };
    let abs = crate::util::paths::resolve_book_file_on_disk(&row.library_path, &row.file_path);
    if !abs.extension().and_then(|e| e.to_str()).unwrap_or("").eq_ignore_ascii_case("pdf") {
        return;
    }
    if !abs.exists() {
        return;
    }
    let pages = tokio::task::spawn_blocking(move || extract_lines_per_page(&abs))
        .await
        .ok()
        .flatten();
    let Some(pages) = pages else {
        return;
    };
    if pages.len() < MIN_PAGES_FOR_PATTERN {
        return;
    }
    let regexes = regexes_from_tallies(&collect_margin_tallies(&pages), pages.len());
    if regexes.is_empty() {
        return;
    }
    let mut meta = parse_meta(&row.metadata);
    let prev = meta
        .get("pdfMarginStripRegexes")
        .and_then(|v| v.as_array())
        .map(|a| {
            a.iter()
                .filter_map(|x| x.as_str().map(String::from))
                .collect::<Vec<_>>()
        });
    if prev.as_ref() == Some(&regexes) {
        return;
    }
    if let Some(obj) = meta.as_object_mut() {
        obj.insert("pdfMarginStripRegexes".to_string(), json!(regexes));
    }
    let _ = sqlx::query(r#"UPDATE Book SET metadata = ?, updatedAt = datetime('now') WHERE id = ?"#)
        .bind(serde_json::to_string(&meta).unwrap_or_else(|_| "{}".to_string()))
        .bind(book_id)
        .execute(pool)
        .await;
}

#[derive(sqlx::FromRow)]
#[allow(dead_code)]
struct BookPdfRow {
    id: i64,
    metadata: Option<String>,
    file_path: String,
    library_path: String,
}

fn parse_meta(raw: &Option<String>) -> Value {
    raw.as_deref()
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or_else(|| json!({}))
}

fn extract_lines_per_page(pdf: &Path) -> Option<Vec<Vec<String>>> {
    let n_pages = pdf_page_count(pdf)?;
    let cap = n_pages.min(MAX_PAGES_SCAN);
    let mut out = Vec::with_capacity(cap);
    for p in 1..=cap {
        let page_text = pdftotext_page(pdf, p)?;
        let lines: Vec<String> = page_text
            .lines()
            .map(str::trim)
            .filter(|l| !l.is_empty())
            .map(String::from)
            .collect();
        out.push(lines);
    }
    Some(out)
}

fn pdf_page_count(pdf: &Path) -> Option<usize> {
    let out = Command::new("pdfinfo")
        .arg(pdf)
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&out.stdout);
    for line in text.lines() {
        if let Some(rest) = line.strip_prefix("Pages:") {
            return rest.trim().parse().ok();
        }
    }
    None
}

fn pdftotext_page(pdf: &Path, page: usize) -> Option<String> {
    let out = Command::new("pdftotext")
        .args([
            "-f",
            &page.to_string(),
            "-l",
            &page.to_string(),
            "-layout",
            &pdf.to_string_lossy(),
            "-",
        ])
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    Some(String::from_utf8_lossy(&out.stdout).to_string())
}

fn collect_margin_tallies(lines_per_page: &[Vec<String>]) -> HashMap<String, MarginTally> {
    let mut tally: HashMap<String, MarginTally> = HashMap::new();
    for (page_index, lines) in lines_per_page.iter().enumerate() {
        if lines.is_empty() {
            continue;
        }
        let head = &lines[..lines.len().min(HEAD_LINE_SLOTS)];
        let tail_start = lines.len().saturating_sub(TAIL_LINE_SLOTS);
        let tail = &lines[tail_start..];
        for line in uniq_non_empty(head) {
            tally_margin_line(&mut tally, "head", &line, page_index);
        }
        for line in uniq_non_empty(tail) {
            tally_margin_line(&mut tally, "tail", &line, page_index);
        }
    }
    tally
}

fn uniq_non_empty(lines: &[String]) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut out = Vec::new();
    for l in lines {
        let t = l.trim();
        if t.is_empty() || !seen.insert(t.to_string()) {
            continue;
        }
        out.push(t.to_string());
    }
    out
}

fn normalize_for_tally(line: &str) -> String {
    regex::Regex::new(r"\d+")
        .ok()
        .map(|re| re.replace_all(line.trim(), "#").to_string())
        .unwrap_or_else(|| line.trim().to_string())
}

fn tally_margin_line(
    tally: &mut HashMap<String, MarginTally>,
    slot: &str,
    line: &str,
    page_index: usize,
) {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return;
    }
    let key = format!("{slot}:{}", normalize_for_tally(trimmed));
    tally
        .entry(key)
        .and_modify(|e| {
            e.pages.insert(page_index);
        })
        .or_insert(MarginTally {
            sample: trimmed.to_string(),
            pages: HashSet::from([page_index]),
        });
}

fn escape_regex_literal(s: &str) -> String {
    regex::escape(s)
}

fn line_to_digit_aware_regex(line: &str) -> Option<String> {
    let t = line.trim();
    if t.is_empty() {
        return None;
    }
    let re = regex::Regex::new(r"\d+").ok()?;
    let mut body = String::new();
    let mut last = 0;
    for m in re.find_iter(t) {
        body.push_str(&escape_regex_literal(&t[last..m.start()]));
        body.push_str(r"\d+");
        last = m.end();
    }
    body.push_str(&escape_regex_literal(&t[last..]));
    Some(format!("^(?:{body})\\s*$"))
}

fn regexes_from_tallies(tally: &HashMap<String, MarginTally>, page_count: usize) -> Vec<String> {
    let threshold = MIN_LINE_HITS.max((MIN_LINE_PAGE_FRACTION * page_count as f64).ceil() as usize);
    let mut out = Vec::new();
    let mut seen = HashSet::new();
    for v in tally.values() {
        if v.pages.len() < threshold {
            continue;
        }
        let Some(re) = line_to_digit_aware_regex(&v.sample) else {
            continue;
        };
        if seen.insert(re.clone()) {
            out.push(re);
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn regexes_from_footer_number_pipe_title() {
        let lines: Vec<Vec<String>> = (0..6)
            .map(|i| {
                vec![
                    format!("Unique narrative body text for page {}.", i + 1),
                    format!("{} | THE BEHAVIOR OPS MANUAL", i + 1),
                ]
            })
            .collect();
        let tally = collect_margin_tallies(&lines);
        let regexes = regexes_from_tallies(&tally, lines.len());
        assert!(!regexes.is_empty());
        assert!(regexes.iter().any(|r| r.contains("BEHAVIOR")));
    }

    #[test]
    fn regexes_from_title_pipe_page_header() {
        let lines: Vec<Vec<String>> = (0..6)
            .map(|i| {
                vec![
                    format!("INTRODUCTION | {}", i + 1),
                    format!("Body continues here on page {}.", i + 1),
                ]
            })
            .collect();
        let tally = collect_margin_tallies(&lines);
        let regexes = regexes_from_tallies(&tally, lines.len());
        assert!(!regexes.is_empty());
        assert!(regexes.iter().any(|r| r.contains("INTRODUCTION")));
    }

    #[test]
    fn regexes_from_synthetic_repeating_header() {
        let lines: Vec<Vec<String>> = (0..6)
            .map(|_| {
                vec![
                    "Chapter 1".to_string(),
                    "body".to_string(),
                    "Page 1".to_string(),
                ]
            })
            .collect();
        let tally = collect_margin_tallies(&lines);
        let regexes = regexes_from_tallies(&tally, lines.len());
        assert!(!regexes.is_empty(), "{regexes:?}");
        assert!(
            regexes.iter().any(|r| r.contains("Chapter")),
            "{regexes:?}"
        );
    }
}