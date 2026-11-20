mod common;

use serde_json::json;
use std::fs;
use common::{gql, gql_path, TestEnv};

#[tokio::test]
async fn graphql_libraries_through_voice_crud() {
    let env = TestEnv::new().await;
    let (user_id, token) = env.insert_user("crud@test.local", "reader1").await;

    let lib_data = gql(
        &env,
        r#"mutation { createLibrary(input: { name: "Lib", path: "p1", type: "NOVEL" }) { id name path } }"#,
        None,
        Some(&token),
    )
    .await;
    let library_id = gql_path(&lib_data, &["createLibrary", "id"])
        .as_i64()
        .expect("library id") as i32;

    gql(
        &env,
        r#"mutation($id: Int!, $in: UpdateLibraryInput!) { updateLibrary(id: $id, input: $in) { name path type } }"#,
        Some(json!({
            "id": library_id,
            "in": { "name": " Lib2 ", "path": " p2 ", "type": " MANGA " }
        })),
        Some(&token),
    )
    .await;

    let name: String = sqlx::query_scalar(r#"SELECT name FROM Library WHERE id = ?"#)
        .bind(library_id)
        .fetch_one(&env.state.pool)
        .await
        .expect("lib name");
    assert_eq!(name, "Lib2");

    let ser_data = gql(
        &env,
        r#"mutation($lid: Int!) { createSeries(input: { libraryId: $lid, title: "Arc", status: "ONGOING" }) { id libraryId title } }"#,
        Some(json!({ "lid": library_id })),
        Some(&token),
    )
    .await;
    let series_id = gql_path(&ser_data, &["createSeries", "id"])
        .as_i64()
        .expect("series id") as i32;

    let pdf_path = env._dir.path().join("chapter.pdf");
    fs::write(&pdf_path, b"%PDF-1.4\n%\n").expect("write pdf");
    let fp = pdf_path.to_string_lossy().replace('\\', "/");

    let book_data = gql(
        &env,
        r#"mutation($lid: Int!, $sid: Int!, $fp: String!) {
            createBook(input: { libraryId: $lid, seriesId: $sid, title: "Ch1", filePath: $fp, metadata: "{\"fileExt\":\"pdf\"}" }) {
                id title libraryId seriesId
            }
        }"#,
        Some(json!({ "lid": library_id, "sid": series_id, "fp": fp })),
        Some(&token),
    )
    .await;
    let book_id = gql_path(&book_data, &["createBook", "id"])
        .as_i64()
        .expect("book id") as i32;

    let nested = gql(
        &env,
        r#"query($lid: Int!, $sid: Int!, $bid: Int!, $uid: Int!) {
            library(id: $lid) { id previewBook { title } series { id title } books { id } }
            seriesList(libraryId: $lid) { id books { id } }
            series(id: $sid) { id books { title } }
            book(id: $bid) { id fileExt readingProgressForUser(userId: $uid) { percentage } }
            recentlyAdded(limit: 5) { id }
        }"#,
        Some(json!({
            "lid": library_id,
            "sid": series_id,
            "bid": book_id,
            "uid": user_id
        })),
        Some(&token),
    )
    .await;

    assert_eq!(
        gql_path(&nested, &["library", "previewBook", "title"]).as_str(),
        Some("Ch1")
    );
    assert_eq!(gql_path(&nested, &["book", "fileExt"]).as_str(), Some("pdf"));
    assert!(gql_path(&nested, &["book", "readingProgressForUser"]).is_null());

    let prog = gql(
        &env,
        r#"mutation($in: UpdateReadingProgressInput!) { updateReadingProgress(input: $in) { userId bookId percentage position } }"#,
        Some(json!({
            "in": { "userId": user_id, "bookId": book_id, "position": "12", "percentage": 42.0 }
        })),
        Some(&token),
    )
    .await;
    assert_eq!(
        gql_path(&prog, &["updateReadingProgress", "percentage"]).as_f64(),
        Some(42.0)
    );

    let deck = gql(
        &env,
        r#"query($uid: Int!) { onDeck(userId: $uid) { book { id } progress { percentage } } }"#,
        Some(json!({ "uid": user_id })),
        Some(&token),
    )
    .await;
    let on_deck = deck.get("onDeck").and_then(|v| v.as_array()).expect("onDeck");
    assert_eq!(on_deck.len(), 1);
    assert_eq!(
        on_deck[0].get("progress").and_then(|p| p.get("percentage")).and_then(|v| v.as_f64()),
        Some(42.0)
    );

    gql(
        &env,
        r#"mutation($u: Int!, $b: Int!) { setBookFavorite(userId: $u, bookId: $b, liked: true) { id } }"#,
        Some(json!({ "u": user_id, "b": book_id })),
        Some(&token),
    )
    .await;

    let fav_list = gql(
        &env,
        r#"query($u: Int!) { favoriteBooks(userId: $u, limit: 10) { id } }"#,
        Some(json!({ "u": user_id })),
        Some(&token),
    )
    .await;
    let ids: Vec<i64> = fav_list
        .get("favoriteBooks")
        .and_then(|v| v.as_array())
        .unwrap()
        .iter()
        .filter_map(|b| b.get("id").and_then(|v| v.as_i64()))
        .collect();
    assert_eq!(ids, vec![book_id as i64]);

    let fav_field = gql(
        &env,
        r#"query($b: Int!, $u: Int!) { book(id: $b) { isFavoriteForUser(userId: $u) } }"#,
        Some(json!({ "b": book_id, "u": user_id })),
        Some(&token),
    )
    .await;
    assert_eq!(
        gql_path(&fav_field, &["book", "isFavoriteForUser"]).as_bool(),
        Some(true)
    );

    gql(
        &env,
        r#"mutation($u: Int!, $b: Int!) { setBookFavorite(userId: $u, bookId: $b, liked: false) { id } }"#,
        Some(json!({ "u": user_id, "b": book_id })),
        Some(&token),
    )
    .await;

    let bm = gql(
        &env,
        r#"mutation($in: AddBookmarkInput!) { addBookmark(input: $in) { id position } }"#,
        Some(json!({
            "in": { "userId": user_id, "bookId": book_id, "position": "1", "note": "n" }
        })),
        Some(&token),
    )
    .await;
    let bm_id = gql_path(&bm, &["addBookmark", "id"]).as_i64().expect("bm id");

    let hl = gql(
        &env,
        r#"mutation($in: AddHighlightInput!) { addHighlight(input: $in) { id text color } }"#,
        Some(json!({
            "in": { "userId": user_id, "bookId": book_id, "startPos": "0", "endPos": "1", "text": "hi" }
        })),
        Some(&token),
    )
    .await;
    let hl_id = gql_path(&hl, &["addHighlight", "id"]).as_i64().expect("hl id");

    let vp = gql(
        &env,
        r#"mutation($in: SaveVoiceProfileInput!) { saveVoiceProfile(input: $in) { id name modelId speed pitch } }"#,
        Some(json!({
            "in": { "userId": user_id, "name": "V1", "modelId": "kokoro" }
        })),
        Some(&token),
    )
    .await;
    let vp_id = gql_path(&vp, &["saveVoiceProfile", "id"]).as_i64().expect("vp id");

    let lists = gql(
        &env,
        r#"query($bid: Int!, $uid: Int!) {
            bookmarks(bookId: $bid) { id }
            highlights(bookId: $bid) { id text }
            userBookmarks(userId: $uid) { bookTitle }
            userHighlights(userId: $uid) { text }
            voiceProfiles(userId: $uid) { name }
        }"#,
        Some(json!({ "bid": book_id, "uid": user_id })),
        Some(&token),
    )
    .await;

    assert_eq!(
        lists.get("bookmarks").and_then(|v| v.as_array()).map(|a| a.len()),
        Some(1)
    );
    let highlights = lists.get("highlights").and_then(|v| v.as_array()).expect("highlights");
    assert_eq!(highlights[0].get("text").and_then(|v| v.as_str()), Some("hi"));
    let user_bm = lists
        .get("userBookmarks")
        .and_then(|v| v.as_array())
        .expect("userBookmarks");
    assert_eq!(
        user_bm[0].get("bookTitle").and_then(|v| v.as_str()),
        Some("Ch1")
    );
    let voices = lists
        .get("voiceProfiles")
        .and_then(|v| v.as_array())
        .expect("voiceProfiles");
    assert_eq!(voices[0].get("name").and_then(|v| v.as_str()), Some("V1"));

    gql(
        &env,
        &format!("mutation {{ deleteBookmark(id: {bm_id}) }}"),
        None,
        Some(&token),
    )
    .await;
    gql(
        &env,
        &format!("mutation {{ deleteHighlight(id: {hl_id}) }}"),
        None,
        Some(&token),
    )
    .await;
    gql(
        &env,
        &format!("mutation {{ deleteVoiceProfile(id: {vp_id}) }}"),
        None,
        Some(&token),
    )
    .await;

    gql(
        &env,
        &format!("mutation {{ deleteBook(id: {book_id}) }}"),
        None,
        Some(&token),
    )
    .await;
    gql(
        &env,
        &format!("mutation {{ deleteSeries(id: {series_id}) }}"),
        None,
        Some(&token),
    )
    .await;
    gql(
        &env,
        &format!("mutation {{ deleteLibrary(id: {library_id}) }}"),
        None,
        Some(&token),
    )
    .await;

    let lib_count: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM Library"#)
        .fetch_one(&env.state.pool)
        .await
        .unwrap();
    let book_count: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM Book"#)
        .fetch_one(&env.state.pool)
        .await
        .unwrap();
    assert_eq!(lib_count, 0);
    assert_eq!(book_count, 0);
}