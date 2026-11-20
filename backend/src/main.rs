use nookline_backend::{app, config, startup, AppState};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    config::assert_production_signing_secret();
    let state = AppState::connect().await.expect("connect sqlite");
    startup::run_startup(&state.pool).await.expect("startup");
    tracing::info!(db = %config::resolve_sqlite_url(), "database ready");

    let app = app::build_router(state);
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(4000);
    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("nookline rust backend listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.expect("bind");
    axum::serve(listener, app).await.expect("serve");
}
