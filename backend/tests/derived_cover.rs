mod common;

use common::TestEnv;
use nookline_backend::db::{create_book_record, create_library, CreateBookInput};
use nookline_backend::services::book::persist_book_derived_cover_if_possible;
use nookline_backend::util::paths::resolve_book_file_on_disk;

#[tokio::test]
async fn derived_cover_none_when_file_missing() {
    let env = TestEnv::new().await;
    let (uid, _) = env.insert_user("dc@test.local", "owner").await;
    let upload = env._dir.path().join("uploads");
    std::fs::create_dir_all(&upload).expect("mkdir");
    std::env::set_var("UPLOAD_DIR", upload.to_string_lossy().as_ref());
    let lib = create_library(&env.state.pool, uid, "L", ".", "NOVEL", 0, None)
        .await
        .expect("lib");
    let ghost = upload.join("ghost.pdf");
    let book = create_book_record(
        &env.state.pool,
        CreateBookInput {
            library_id: lib.id,
            series_id: None,
            open_library_series_name: None,
            title: "X".to_string(),
            file_path: ghost.to_string_lossy().into(),
            cover_image_path: None,
            volume_number: None,
            metadata: None,
        },
    )
    .await
    .expect("book");
    assert!(!resolve_book_file_on_disk(".", &ghost.to_string_lossy()).exists());
    assert!(
        persist_book_derived_cover_if_possible(&env.state.pool, book.id)
            .await
            .is_none()
    );
}
