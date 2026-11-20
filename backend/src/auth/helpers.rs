use regex::Regex;
use std::sync::OnceLock;

pub fn username_re() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"^[a-zA-Z0-9_\p{L}]{2,32}$").expect("username re"))
}

pub fn normalize_username(s: &str) -> String {
    s.trim().to_lowercase()
}

pub fn email_for_username(u: &str) -> String {
    format!("{u}@nookline.user")
}

pub fn is_valid_username(un: &str) -> bool {
    username_re().is_match(un)
}