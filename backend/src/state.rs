use sqlx::sqlite::SqlitePoolOptions;
use sqlx::SqlitePool;

use crate::config;

#[derive(Clone)]
pub struct AppState {
    pub pool: SqlitePool,
    pub jwt_secret: String,
}

impl AppState {
    pub async fn connect() -> Result<Self, sqlx::Error> {
        let url = config::resolve_sqlite_url();
        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect(&url)
            .await?;
        Ok(Self {
            pool,
            jwt_secret: config::jwt_signing_secret(),
        })
    }
}