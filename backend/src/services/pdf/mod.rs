mod embedded;
mod margin_strip;
mod page_text;

pub use embedded::{extract_pdf_embedded_metadata, PdfEmbeddedMeta};
pub use margin_strip::{
    infer_and_persist_pdf_margin_strip_regexes, infer_margin_strip_regexes_from_pdf,
};
pub use page_text::{guess_pdf_title_author_from_first_page, PdfPlainTextGuess};
