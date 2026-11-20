pub mod client;
mod enrich;
mod series_attach;

pub use enrich::{enrich_book_record, enrich_series_record};
pub use series_attach::resolve_series_attachment_from_work;