use std::path::Path;
use std::process::Command;

const MAX_BYTES: u64 = 40 * 1024 * 1024;
const MAX_TITLE_LEN: usize = 280;
const MAX_AUTHOR_LEN: usize = 160;

#[derive(Clone, Default)]
pub struct PdfPlainTextGuess {
    pub title: Option<String>,
    pub author: Option<String>,
}

pub fn guess_pdf_title_author_from_first_page(path: &Path, file_size: u64) -> PdfPlainTextGuess {
    if file_size > MAX_BYTES {
        return PdfPlainTextGuess::default();
    }
    let Ok(out) = Command::new("pdftotext")
        .args(["-f", "1", "-l", "1", "-layout", &path.to_string_lossy(), "-"])
        .output()
    else {
        return PdfPlainTextGuess::default();
    };
    if !out.status.success() {
        return PdfPlainTextGuess::default();
    }
    let text = String::from_utf8_lossy(&out.stdout);
    let lines: Vec<String> = text
        .lines()
        .map(normalize_spaces)
        .filter(|l| !l.is_empty() && !looks_like_noise_line(l))
        .collect();
    infer_title_author_from_plain_lines(&lines)
}

fn normalize_spaces(s: &str) -> String {
    s.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn strip_trailing_author_junk(s: &str) -> String {
    s.trim_end_matches(['.', ',', ';', ':'])
        .trim()
        .to_string()
}

fn looks_like_noise_line(line: &str) -> bool {
    let t = line.trim();
    if t.len() < 2 {
        return true;
    }
    if t.len() <= 4 && t.chars().all(|c| c.is_ascii_digit()) {
        return true;
    }
    let lower = t.to_ascii_lowercase();
    if lower.contains("http://") || lower.contains("https://") {
        return true;
    }
    if regex::Regex::new(r"^(copyright|©|all rights reserved|isbn|issn|printed in|published by)\b")
        .ok()
        .is_some_and(|re| re.is_match(&lower))
    {
        return true;
    }
    lower.starts_with("project gutenberg")
}

fn infer_title_author_from_plain_lines(lines: &[String]) -> PdfPlainTextGuess {
    if lines.is_empty() {
        return PdfPlainTextGuess::default();
    }
    let scan = lines.len().min(24);
    let by_re =
        regex::Regex::new(r"(?i)^(.{2,240}?)\s+by\s+(.{2,120})$").ok();
    for line in lines.iter().take(scan) {
        let Some(re) = by_re.as_ref() else {
            break;
        };
        let Some(cap) = re.captures(line) else {
            continue;
        };
        let title = normalize_spaces(cap.get(1).map(|m| m.as_str()).unwrap_or(""));
        let author =
            strip_trailing_author_junk(&normalize_spaces(cap.get(2).map(|m| m.as_str()).unwrap_or("")));
        if title.len() >= 2 && author.len() >= 2 {
            return PdfPlainTextGuess {
                title: Some(title.chars().take(MAX_TITLE_LEN).collect()),
                author: Some(author.chars().take(MAX_AUTHOR_LEN).collect()),
            };
        }
    }
    let by_line_re = regex::Regex::new(r"(?i)^by\s+(.{2,200})$").ok();
    for i in 1..scan {
        let Some(re) = by_line_re.as_ref() else {
            break;
        };
        let Some(cap) = re.captures(&lines[i]) else {
            continue;
        };
        let author = strip_trailing_author_junk(&normalize_spaces(
            cap.get(1).map(|m| m.as_str()).unwrap_or(""),
        ));
        if author.len() < 2 {
            continue;
        }
        let title_block: Vec<&str> = lines[..i]
            .iter()
            .map(|s| s.as_str())
            .filter(|l| !looks_like_noise_line(l))
            .collect();
        if title_block.is_empty() {
            continue;
        }
        let title = normalize_spaces(&title_block.join(" "));
        if title.len() >= 2 {
            return PdfPlainTextGuess {
                title: Some(title.chars().take(MAX_TITLE_LEN).collect()),
                author: Some(author.chars().take(MAX_AUTHOR_LEN).collect()),
            };
        }
    }
    PdfPlainTextGuess::default()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn infer(lines: &[&str]) -> PdfPlainTextGuess {
        let v: Vec<String> = lines.iter().map(|s| s.to_string()).collect();
        infer_title_author_from_plain_lines(&v)
    }

    #[test]
    fn single_line_title_by_author() {
        let g = infer(&["Don Quixote by Miguel de Cervantes"]);
        assert_eq!(g.title.as_deref(), Some("Don Quixote"));
        assert_eq!(g.author.as_deref(), Some("Miguel de Cervantes"));
    }

    #[test]
    fn stacked_title_then_by_line() {
        let g = infer(&["THE ADVENTURES", "OF TOM SAWYER", "by Mark Twain"]);
        assert_eq!(g.title.as_deref(), Some("THE ADVENTURES OF TOM SAWYER"));
        assert_eq!(g.author.as_deref(), Some("Mark Twain"));
    }

    #[test]
    fn ignores_noise_before_by_line() {
        let g = infer(&["3", "Copyright 1999", "Pride and Prejudice", "by Jane Austen"]);
        assert_eq!(g.title.as_deref(), Some("Pride and Prejudice"));
        assert_eq!(g.author.as_deref(), Some("Jane Austen"));
    }

    #[test]
    fn no_by_pattern_returns_empty() {
        let g = infer(&["Some Title Only", "Subtitle Here"]);
        assert!(g.title.is_none() && g.author.is_none());
    }
}