mod common;

use nookline_backend::services::tts_probe::probe_tts_synthesis;
use nookline_backend::services::tts_resolve::ResolvedTtsTarget;
use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

#[tokio::test]
async fn probe_ok_on_enough_audio_bytes() {
    let server = MockServer::start().await;
    let body = vec![1u8; 200];
    Mock::given(method("POST"))
        .and(path("/v1/audio/speech"))
        .respond_with(
            ResponseTemplate::new(200)
                .insert_header("content-type", "audio/mpeg")
                .set_body_bytes(body),
        )
        .mount(&server)
        .await;

    let target = ResolvedTtsTarget {
        speech_url: format!("{}/v1/audio/speech", server.uri()),
        authorization: None,
        default_voice: "v".to_string(),
        default_model: "m".to_string(),
    };
    let r = probe_tts_synthesis(&target).await;
    assert!(r.ok);
    assert!(r.error.is_none());
}

#[tokio::test]
async fn probe_fails_on_short_body() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/v1/audio/speech"))
        .respond_with(
            ResponseTemplate::new(200)
                .insert_header("content-type", "audio/mpeg")
                .set_body_bytes(vec![1, 2, 3, 4]),
        )
        .mount(&server)
        .await;

    let target = ResolvedTtsTarget {
        speech_url: format!("{}/v1/audio/speech", server.uri()),
        authorization: None,
        default_voice: "v".to_string(),
        default_model: "m".to_string(),
    };
    let r = probe_tts_synthesis(&target).await;
    assert!(!r.ok);
    assert!(r.error.unwrap_or_default().contains("4 bytes"));
}