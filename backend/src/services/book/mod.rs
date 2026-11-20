pub mod disk_artifacts;
pub mod local_fallback;

pub use disk_artifacts::{unlink_book_disk_artifacts, BookDiskArtifactInput};
pub use local_fallback::persist_book_derived_cover_if_possible;
