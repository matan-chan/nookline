mod common;

use common::TestEnv;
use nookline_backend::db::{create_book_record, create_library, CreateBookInput};
use nookline_backend::services::book::local_fallback::apply_local_book_fallback;
use nookline_backend::util::paths::{resolve_book_file_on_disk, strip_windows_verbatim_path};
use std::path::Path;

fn same_file(a: &Path, b: &Path) -> bool {
    let na = strip_windows_verbatim_path(&a.to_string_lossy());
    let nb = strip_windows_verbatim_path(&b.to_string_lossy());
    na.canonicalize().unwrap_or(na) == nb.canonicalize().unwrap_or(nb)
}

#[tokio::test]
async fn comedy_shelf_paths_normalize_for_fallback() {
    let env = TestEnv::new().await;
    let (uid, _) = env.insert_user("com@test.local", "owner").await;
    let books_base = env._dir.path().join("books-base");
    let comedy = books_base.join("comedy");
    std::fs::create_dir_all(&comedy).expect("mkdir");
    std::fs::write(comedy.join("a.pdf"), b"%PDF-1.4\n%\n").expect("pdf");
    std::env::set_var("UPLOAD_DIR", books_base.to_string_lossy().as_ref());

    for lib_path in ["comedy", "/comedy", "\\comedy"] {
        let lib = create_library(&env.state.pool, uid, "Shelf", lib_path, "NOVEL", 0, None)
            .await
            .expect("lib");
        let stored = "a.pdf";
        let want = books_base.join("comedy").join("a.pdf");
        let resolved = resolve_book_file_on_disk(lib_path, stored);
        assert!(same_file(&resolved, &want), "resolved {resolved:?} want {want:?}");
        let book = create_book_record(
            &env.state.pool,
            CreateBookInput {
                library_id: lib.id,
                series_id: None,
                open_library_series_name: None,
                title: "a.pdf".to_string(),
                file_path: stored.to_string(),
                cover_image_path: None,
                volume_number: None,
                metadata: None,
            },
        )
        .await
        .expect("book");
        apply_local_book_fallback(&env.state.pool, book.id)
            .await
            .expect("fb");
        let meta: String = sqlx::query_scalar(r#"SELECT metadata FROM Book WHERE id = ?"#)
            .bind(book.id)
            .fetch_one(&env.state.pool)
            .await
            .expect("meta");
        let v: serde_json::Value = serde_json::from_str(&meta).expect("json");
        assert_eq!(
            v.get("localFallback")
                .and_then(|lf| lf.get("filenameSlug"))
                .and_then(|s| s.as_str()),
            Some("a")
        );
    }
}