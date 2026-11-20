use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use hmac::{Hmac, Mac};
use serde::Deserialize;
use sha2::Sha256;
use subtle::ConstantTimeEq;

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Deserialize)]
pub struct TokenPayload {
    pub sub: i64,
    pub adm: bool,
    pub exp: i64,
}

fn sign_body(body: &str, secret: &str) -> Option<String> {
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).ok()?;
    mac.update(body.as_bytes());
    let bytes = mac.finalize().into_bytes();
    Some(URL_SAFE_NO_PAD.encode(bytes))
}

pub fn verify_auth_token(raw: &str, secret: &str) -> Option<TokenPayload> {
    if raw.len() < 20 {
        return None;
    }
    let i = raw.rfind('.')?;
    if i == 0 {
        return None;
    }
    let body = &raw[..i];
    let mac = &raw[i + 1..];
    let want = sign_body(body, secret)?;
    if mac.len() != want.len() {
        return None;
    }
    if mac.as_bytes().ct_eq(want.as_bytes()).unwrap_u8() != 1 {
        return None;
    }
    let decoded = URL_SAFE_NO_PAD.decode(body).ok()?;
    let p: TokenPayload = serde_json::from_slice(&decoded).ok()?;
    if p.exp < chrono::Utc::now().timestamp_millis() {
        return None;
    }
    Some(p)
}

pub const AUTH_TOKEN_TTL_MS: i64 = 30 * 24 * 60 * 60 * 1000;

pub fn create_auth_token(user_id: i64, is_admin: bool, ttl_ms: i64, secret: &str) -> String {
    let exp = chrono::Utc::now().timestamp_millis() + ttl_ms;
    let body_json = serde_json::json!({
        "sub": user_id,
        "adm": is_admin,
        "exp": exp,
    });
    let body = URL_SAFE_NO_PAD.encode(body_json.to_string().as_bytes());
    let mac = sign_body(&body, secret).unwrap_or_default();
    format!("{body}.{mac}")
}

pub fn bearer_token(header: Option<&str>) -> Option<&str> {
    let h = header?;
    let rest = h.strip_prefix("Bearer ")?;
    let t = rest.trim();
    if t.is_empty() {
        return None;
    }
    Some(t)
}
