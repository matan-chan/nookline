use std::path::Path;

const DEV_JWT_SECRET: &str = "nookline-dev-auth-secret-change-in-production";

const WEAK_SECRETS: &[&str] = &[
    "local-dev-only-replace-with-a-long-random-secret",
    "nookline-dev-auth-secret-change-in-production",
    "changeme",
    "secret",
];

pub fn assert_production_signing_secret() {
    if std::env::var("NODE_ENV").map(|v| v == "production").unwrap_or(false) {
        let s = jwt_signing_secret();
        let lower = s.to_lowercase();
        if s.len() < 32 || WEAK_SECRETS.iter().any(|w| lower == *w) {
            eprintln!(
                "Fatal: JWT_SECRET or AUTH_SECRET must be a strong random value (>=32 chars, not a known placeholder)."
            );
            std::process::exit(1);
        }
    }
}

pub fn jwt_signing_secret() -> String {
    std::env::var("JWT_SECRET")
        .or_else(|_| std::env::var("AUTH_SECRET"))
        .unwrap_or_else(|_| DEV_JWT_SECRET.to_string())
        .trim()
        .to_string()
}

pub fn resolve_sqlite_url() -> String {
    let raw = std::env::var("DATABASE_URL").unwrap_or_else(|_| default_prisma_file_url());
    prisma_file_url_to_sqlx(&raw)
}

fn default_prisma_file_url() -> String {
    if Path::new("/.dockerenv").exists() {
        return "file:/data/app.db".to_string();
    }
    let cwd = std::env::current_dir().unwrap_or_default();
    let p = cwd.join("prisma").join("dev.db");
    format!("file:{}", p.to_string_lossy().replace('\\', "/"))
}

fn prisma_file_url_to_sqlx(raw: &str) -> String {
    let trimmed = raw.trim();
    if trimmed.starts_with("sqlite:") {
        return trimmed.to_string();
    }
    if let Some(path) = trimmed.strip_prefix("file:") {
        return format!("sqlite:{}", path);
    }
    format!("sqlite:{}", trimmed)
}