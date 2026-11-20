use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use rand::RngCore;
use scrypt::{scrypt, Params};
use subtle::ConstantTimeEq;

pub fn hash_password(plain: &str) -> Result<String, String> {
    let mut salt = [0u8; 16];
    rand::rng().fill_bytes(&mut salt);
    let mut out = [0u8; 64];
    let params = Params::new(14, 8, 1, 64).map_err(|e| e.to_string())?;
    scrypt(plain.as_bytes(), &salt, &params, &mut out).map_err(|e| e.to_string())?;
    Ok(format!(
        "scrypt:{}:{}",
        STANDARD.encode(salt),
        STANDARD.encode(out)
    ))
}

pub fn verify_password_scrypt(plain: &str, stored: &str) -> bool {
    let Some(rest) = stored.strip_prefix("scrypt:") else {
        return false;
    };
    let Some((salt_b64, hash_b64)) = rest.split_once(':') else {
        return false;
    };
    let Ok(salt) = STANDARD.decode(salt_b64) else {
        return false;
    };
    let Ok(want) = STANDARD.decode(hash_b64) else {
        return false;
    };
    let mut buf = vec![0u8; want.len()];
    let params = match Params::new(14, 8, 1, want.len()) {
        Ok(p) => p,
        Err(_) => return false,
    };
    if scrypt(plain.as_bytes(), &salt, &params, &mut buf).is_err() {
        return false;
    }
    buf.len() == want.len() && buf.as_slice().ct_eq(want.as_slice()).unwrap_u8() == 1
}

pub fn validate_password_strength(plain: &str) -> Result<(), &'static str> {
    let t = plain.trim();
    if t.len() < 8 {
        return Err("Password must be at least 8 characters.");
    }
    if t.len() > 128 {
        return Err("Password is too long.");
    }
    let lower = t.chars().any(|c| c.is_ascii_lowercase());
    let upper = t.chars().any(|c| c.is_ascii_uppercase());
    let digit = t.chars().any(|c| c.is_ascii_digit());
    let special = t.chars().any(|c| !c.is_alphanumeric());
    let classes = [lower, upper, digit, special]
        .iter()
        .filter(|&&x| x)
        .count();
    if classes < 3 {
        return Err("Use at least three of: lower case, upper case, digits, symbols.");
    }
    Ok(())
}
