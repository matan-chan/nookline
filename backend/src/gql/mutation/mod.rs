mod book;
mod customization;
mod library;
mod series;
mod social;
mod tts;

use async_graphql::MergedObject;

pub use book::BookMutation;
pub use customization::CustomizationMutation;
pub use library::LibraryMutation;
pub use series::SeriesMutation;
pub use social::SocialMutation;
pub use tts::TtsMutation;

#[derive(MergedObject, Default)]
pub struct MutationRoot(
    LibraryMutation,
    BookMutation,
    SeriesMutation,
    SocialMutation,
    TtsMutation,
    CustomizationMutation,
);
