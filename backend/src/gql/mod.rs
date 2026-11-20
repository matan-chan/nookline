mod extra_types;
mod mutation;
mod query;
mod types;

use async_graphql::{EmptySubscription, Schema};

pub use mutation::MutationRoot;
pub use query::QueryRoot;

static SCHEMA: std::sync::OnceLock<Schema<QueryRoot, MutationRoot, EmptySubscription>> =
    std::sync::OnceLock::new();

pub fn schema() -> &'static Schema<QueryRoot, MutationRoot, EmptySubscription> {
    SCHEMA.get_or_init(|| {
        Schema::build(
            QueryRoot,
            MutationRoot::default(),
            EmptySubscription,
        )
        .finish()
    })
}