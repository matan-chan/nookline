mod common;

use common::TestEnv;
use nookline_backend::db::create_library;
use nookline_backend::util::paths::{resolve_book_file_on_disk, upload_base_dir};
use nookline_backend::util::upload_library_dir::{
    resolve_book_upload_directory, UploadLibraryDirError,
};
use std::path::Path;

#[tokio::test]
async fn upload_directory_resolves_libraries() {
    let env = TestEnv::new().await;
    let (uid, _) = env.insert_user("up@test.local", "owner").await;
    let books_base = env._dir.path().join("books-base");
    std::fs::create_dir_all(&books_base).expect("mkdir");
    std::env::set_var("UPLOAD_DIR", books_base.to_string_lossy().as_ref());

    let root = resolve_book_upload_directory(&env.state.pool, None)
        .await
        .expect("root");
    assert_eq!(root.canonicalize().unwrap_or(root.clone()), books_base.canonicalize().unwrap_or(books_base.clone()));

    let lib = create_library(
        &env.state.pool,
        uid,
        "Comedy",
        "comedy",
        "NOVEL",
        0,
        None,
    )
    .await
    .expect("lib");

    let dir = resolve_book_upload_directory(&env.state.pool, Some(&lib.id.to_string()))
        .await
        .expect("comedy dir");
    let want = books_base.join("comedy").canonicalize().unwrap_or(books_base.join("comedy"));
    assert_eq!(dir.canonicalize().unwrap_or_else(|_| dir.clone()), want);

    let slash = create_library(
        &env.state.pool,
        uid,
        "Slash",
        "/comedy",
        "NOVEL",
        0,
        None,
    )
    .await
    .expect("lib2");
    let dir2 = resolve_book_upload_directory(&env.state.pool, Some(&slash.id.to_string()))
        .await
        .expect("slash");
    assert_eq!(dir2.canonicalize().unwrap_or(dir2), want);

    let abs_book = resolve_book_file_on_disk("comedy", "1730000_a.pdf");
    let parent = Path::new(&abs_book).parent().expect("parent");
    assert_eq!(
        parent.canonicalize().unwrap_or_else(|_| parent.to_path_buf()),
        dir.canonicalize().unwrap_or_else(|_| dir.clone())
    );

    let bad = resolve_book_upload_directory(&env.state.pool, Some("nope")).await;
    assert_eq!(bad, Err(UploadLibraryDirError::InvalidLibraryId));

    let missing = resolve_book_upload_directory(&env.state.pool, Some("999999")).await;
    assert_eq!(missing, Err(UploadLibraryDirError::LibraryNotFound));

    let _ = upload_base_dir();
}