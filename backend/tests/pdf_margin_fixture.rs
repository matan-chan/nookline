use std::path::PathBuf;

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

fn fixture(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join(name)
}

fn strip_with_line_regexes(text: &str, regexes: &[String]) -> String {
    let mut t = text.to_string();
    for re in regexes {
        let Ok(r) = Regex::new(&format!("(?m){re}")) else {
            continue;
        };
        t = r.replace_all(&t, "").into_owned();
    }
    let collapse = Regex::new(r"\n{3,}").expect("re");
    collapse.replace_all(&t, "\n\n").trim().to_string()
}

fn matches_any_line_regex(line: &str, regexes: &[String]) -> bool {
    regexes.iter().any(|re| {
        Regex::new(&format!("(?m){re}"))
            .ok()
            .is_some_and(|r| r.is_match(line.trim()))
    })
}

#[test]
fn infer_regex_repeating_footer_number_pipe_title() {
    if !poppler_ready() {
        return;
    }
    let pdf = fixture("margin-footer-6p.pdf");
    assert!(
        pdf.exists(),
        "run: node backend/scripts/gen_margin_fixtures.mjs (npm install pdf-lib)"
    );
    let regexes = infer_margin_strip_regexes_from_pdf(&pdf).expect("extract");
    assert!(!regexes.is_empty(), "{regexes:?}");
    let stripped =
        strip_with_line_regexes("Some text\n5 | THE BEHAVIOR OPS MANUAL\nmore", &regexes);
    assert!(!stripped.contains("THE BEHAVIOR OPS MANUAL"));
    assert!(stripped.contains("Some text"));
    assert!(stripped.contains("more"));
}

#[test]
fn infer_regex_repeating_header_title_pipe_page() {
    if !poppler_ready() {
        return;
    }
    let pdf = fixture("margin-header-6p.pdf");
    assert!(pdf.exists());
    let regexes = infer_margin_strip_regexes_from_pdf(&pdf).expect("extract");
    assert!(!regexes.is_empty());
    assert!(matches_any_line_regex("INTRODUCTION | 9", &regexes));
}

#[test]
fn infer_regex_fewer_than_three_pages_returns_empty() {
    if !poppler_ready() {
        return;
    }
    let pdf = fixture("margin-footer-2p.pdf");
    assert!(pdf.exists());
    let regexes = infer_margin_strip_regexes_from_pdf(&pdf).expect("extract");
    assert!(regexes.is_empty());
}
