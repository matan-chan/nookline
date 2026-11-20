pub fn tts_upstream_connection_message(err: &str, request_url: &str) -> String {
    let raw = err.trim();
    let connection_fail = regex::Regex::new(
        r"(?i)unable to connect|connection refused|not found|dns|network|fetch failed|failed to connect|connect error|unreachable",
    )
    .ok()
    .is_some_and(|re| re.is_match(raw));
    if !connection_fail {
        return raw.to_string();
    }
    let origin = origin_from_url(request_url);
    let host = host_from_url(request_url);
    if host == "kokoro" {
        return format!(
            r#"Cannot reach TTS at {origin}. Hostname "kokoro" only resolves on Docker networks (shared Kokoro from apps/kokoro). Nookline's backend is reaching Kokoro from wherever it runs — if that is your PC (dev server on :4006), use http://127.0.0.1:8881 (published port). If the backend runs in Docker with nginx-proxy-manager, use http://kokoro:8880."#
        );
    }
    let looks_local =
        regex::Regex::new(r"(?i)localhost|127\.0\.0\.1|:8880\b|:8881\b|:8882\b")
            .ok()
            .is_some_and(|re| re.is_match(request_url));
    let hint = if looks_local {
        " Start GPU Kokoro (docker compose), or set TTS_URL. If this host has no GPU or Kokoro keeps crashing, use Settings → Text-to-speech → OpenAI compatible and point at CPU Kokoro or another TTS API."
    } else {
        " Check Settings → custom TTS base URL, VPN, firewall, and that the service is running."
    };
    format!("Cannot reach TTS at {origin}.{hint}")
}

fn origin_from_url(url: &str) -> String {
    let (scheme, rest) = if let Some(r) = url.strip_prefix("https://") {
        ("https", r)
    } else if let Some(r) = url.strip_prefix("http://") {
        ("http", r)
    } else {
        return url.to_string();
    };
    let authority = rest.split('/').next().unwrap_or(rest);
    format!("{scheme}://{authority}")
}

fn host_from_url(url: &str) -> String {
    let rest = url
        .strip_prefix("https://")
        .or_else(|| url.strip_prefix("http://"))
        .unwrap_or(url);
    let authority = rest.split('/').next().unwrap_or(rest);
    authority
        .split('@')
        .next_back()
        .unwrap_or(authority)
        .split(':')
        .next()
        .unwrap_or(authority)
        .to_string()
}