mod common;

use serde_json::json;
use std::fs;

use common::{gql, TestEnv};

#[tokio::test]
async fn tts_settings_probe_sync_and_enrich_stubs() {
    let env = TestEnv::new().await;
    let (uid, token) = env.insert_user("tts@test.local", "ttsuser").await;

    let tts0 = gql(
        &env,
        r#"query($u: Int!) { ttsSettings(userId: $u) { mode voice model readerShowPage } }"#,
        Some(json!({ "u": uid })),
        Some(&token),
    )
    .await;
    assert_eq!(
        tts0.get("ttsSettings")
            .and_then(|t| t.get("mode"))
            .and_then(|v| v.as_str()),
        Some("kokoro")
    );

    let tts1 = gql(
        &env,
        r#"mutation($in: UpdateTtsSettingsInput!) { updateTtsSettings(input: $in) { mode readerShowPage readerDarkDocument voice } }"#,
        Some(json!({
            "in": {
                "userId": uid,
                "mode": "kokoro",
                "readerShowPage": false,
                "readerDarkDocument": true,
                "voice": "af_bella"
            }
        })),
        Some(&token),
    )
    .await;
    let upd = tts1.get("updateTtsSettings").expect("updateTtsSettings");
    assert_eq!(
        upd.get("readerShowPage").and_then(|v| v.as_bool()),
        Some(false)
    );
    assert_eq!(
        upd.get("readerDarkDocument").and_then(|v| v.as_bool()),
        Some(true)
    );
    assert_eq!(upd.get("voice").and_then(|v| v.as_str()), Some("af_bella"));

    let probe = gql(
        &env,
        r#"query($u: Int!) { ttsEngineProbe(userId: $u) { ok error } }"#,
        Some(json!({ "u": uid })),
        Some(&token),
    )
    .await;
    assert!(probe
        .get("ttsEngineProbe")
        .and_then(|p| p.get("ok"))
        .and_then(|v| v.as_bool())
        .is_some());

    let books_root = env._dir.path().join("books-vol");
    let shelf = books_root.join("shelf-a");
    fs::create_dir_all(&shelf).expect("mkdir");
    fs::write(shelf.join("synced.pdf"), b"%PDF-1.4\n%\n").expect("pdf");
    std::env::set_var("UPLOAD_DIR", books_root.to_string_lossy().as_ref());

    let lib = gql(
        &env,
        r#"mutation { createLibrary(input: { name: "DiskLib", path: "shelf-a", type: "NOVEL" }) { id } }"#,
        None,
        Some(&token),
    )
    .await;
    let lib_id = lib
        .get("createLibrary")
        .and_then(|l| l.get("id"))
        .and_then(|v| v.as_i64())
        .expect("lib id");

    let sync = gql(
        &env,
        r#"mutation($lid: Int!) { syncLibraryFromDisk(libraryId: $lid) { id title filePath } }"#,
        Some(json!({ "lid": lib_id })),
        Some(&token),
    )
    .await;
    let synced = sync
        .get("syncLibraryFromDisk")
        .and_then(|v| v.as_array())
        .expect("sync array");
    assert_eq!(synced.len(), 1);
    assert!(synced[0]
        .get("filePath")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .contains("synced.pdf"));

    let e_lib = gql(
        &env,
        r#"mutation { createLibrary(input: { name: "ELib", path: "elib", type: "NOVEL" }) { id } }"#,
        None,
        Some(&token),
    )
    .await;
    let elib_id = e_lib
        .get("createLibrary")
        .and_then(|l| l.get("id"))
        .and_then(|v| v.as_i64())
        .expect("elib");

    let pdf = env._dir.path().join("e.pdf");
    fs::write(&pdf, b"%PDF").expect("pdf");
    let book = gql(
        &env,
        r#"mutation($lid: Int!, $fp: String!) {
            createBook(input: { libraryId: $lid, title: "SearchTitle", filePath: $fp }) { id }
        }"#,
        Some(json!({ "lid": elib_id, "fp": pdf.to_string_lossy() })),
        Some(&token),
    )
    .await;
    let book_id = book
        .get("createBook")
        .and_then(|b| b.get("id"))
        .and_then(|v| v.as_i64())
        .expect("book");

    let series = gql(
        &env,
        r#"mutation($lid: Int!) { createSeries(input: { libraryId: $lid, title: "SearchSeries", status: "ONGOING" }) { id } }"#,
        Some(json!({ "lid": elib_id })),
        Some(&token),
    )
    .await;
    let series_id = series
        .get("createSeries")
        .and_then(|s| s.get("id"))
        .and_then(|v| v.as_i64())
        .expect("series");

    std::env::set_var("OL_ORIGIN", "http://127.0.0.1:1");
    gql(
        &env,
        &format!("mutation {{ enrichBookFromOpenLibrary(id: {book_id}) {{ id }} }}"),
        None,
        Some(&token),
    )
    .await;
    gql(
        &env,
        &format!("mutation {{ enrichSeriesFromOpenLibrary(id: {series_id}) {{ id }} }}"),
        None,
        Some(&token),
    )
    .await;

    let meta: String = sqlx::query_scalar(r#"SELECT metadata FROM Book WHERE id = ?"#)
        .bind(book_id)
        .fetch_one(&env.state.pool)
        .await
        .expect("meta");
    let v: serde_json::Value = serde_json::from_str(&meta).expect("json");
    assert_eq!(
        v.get("openLibrary")
            .and_then(|o| o.get("fetchFailed"))
            .and_then(|x| x.as_bool()),
        Some(true)
    );
}
