mod common;

use common::TestEnv;
use nookline_backend::db::create_library;
use nookline_backend::services::library_disk_sync::sync_library_books_from_disk;
use std::fs;

#[tokio::test]
async fn sync_imports_pdf_once() {
    let env = TestEnv::new().await;
    let (uid, _token) = env.insert_user("sync@test.local", "owner").await;

    let books_root = env._dir.path().join("books-root");
    let scan = books_root.join("scan");
    fs::create_dir_all(&scan).expect("mkdir");
    fs::write(scan.join("hello.pdf"), b"%PDF-1.4\n%\n").expect("pdf");

    std::env::set_var("UPLOAD_DIR", books_root.to_string_lossy().as_ref());

    let lib = create_library(&env.state.pool, uid, "Disk", "scan", "NOVEL", 0, None)
        .await
        .expect("library");

    let added = sync_library_books_from_disk(&env.state.pool, lib.id)
        .await
        .expect("sync");
    assert_eq!(added.len(), 1);
    assert!(added[0].file_path.contains("hello.pdf"));

    let again = sync_library_books_from_disk(&env.state.pool, lib.id)
        .await
        .expect("sync2");
    assert!(again.is_empty());
}
