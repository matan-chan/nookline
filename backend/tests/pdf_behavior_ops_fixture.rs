use std::path::{Path, PathBuf};

use nookline_backend::services::pdf::infer_margin_strip_regexes_from_pdf;
use regex::Regex;

fn poppler_ready() -> bool {
    std::process::Command::new("pdfinfo")
        .arg("-v")
        .output()
        .is_ok()
        && std::process::Command::new("pdftotext")
            .arg("-v")
            .output()
            .is_ok()
}

fn resolve_behavior_ops_pdf() -> Option<PathBuf> {
    if let Ok(from_env) = std::env::var("NAVON_BEHAVIOR_OPS_PDF") {
        let t = from_env.trim();
        if !t.is_empty() {
            return Some(PathBuf::from(t));
        }
    }
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .ok()?;
    let p = PathBuf::from(home)
        .join("Desktop")
        .join("_OceanofPDF.com_The_Behavior_Ops_Manual_-_Chase_Hughes.pdf");
    p.is_file().then_some(p)
}

fn pdftotext_page(pdf: &Path, page: usize) -> Option<String> {
    let out = std::process::Command::new("pdftotext")
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
    Some(String::from_utf8_lossy(&out.stdout).into_owned())
}

fn strip_with_line_regexes(text: &str, regexes: &[String]) -> String {
    let mut t = text.to_string();
    for re in regexes {
        let Ok(r) = Regex::new(&format!("(?m){re}")) else {
            continue;
        };
        t = r.replace_all(&t, "").into_owned();
    }
    Regex::new(r"\n{3,}")
        .expect("re")
        .replace_all(&t, "\n\n")
        .trim()
        .to_string()
}

fn find_margin_line(pdf: &Path, regexes: &[String]) -> Option<String> {
    let compiled: Vec<Regex> = regexes
        .iter()
        .filter_map(|re| Regex::new(&format!("(?m){re}")).ok())
        .collect();
    for page in 3..=30 {
        let text = pdftotext_page(pdf, page)?;
        if let Some(line) = text
            .lines()
            .map(str::trim)
            .filter(|l| !l.is_empty())
            .find(|line| compiled.iter().any(|r| r.is_match(line)))
        {
            return Some(line.to_string());
        }
    }
    None
}

#[test]
#[ignore = "run with NAVON_BEHAVIOR_OPS_PDF or local Desktop fixture: cargo test --ignored"]
fn infer_regex_behavior_ops_manual_pdf() {
    if !poppler_ready() {
        return;
    }
    let Some(pdf) = resolve_behavior_ops_pdf() else {
        return;
    };
    let regexes = infer_margin_strip_regexes_from_pdf(&pdf).expect("extract");
    assert!(!regexes.is_empty(), "{regexes:?}");
    let margin_line = find_margin_line(&pdf, &regexes).expect("margin line on pages 3-30");
    let block = format!("Keep this sentence.\n{margin_line}\nKeep this tail.");
    let stripped = strip_with_line_regexes(&block, &regexes);
    assert!(stripped.contains("Keep this sentence."));
    assert!(stripped.contains("Keep this tail."));
    assert!(!stripped.contains(margin_line.trim()));
}
