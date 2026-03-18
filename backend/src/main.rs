mod config;
mod db;
mod error;
mod handlers;
mod models;
mod routes;

use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load .env file
    dotenvy::dotenv().ok();

    // Init tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info,worky_backend=debug".to_string()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load config
    let config = config::Config::from_env()?;

    // Ensure upload dir exists
    std::fs::create_dir_all(&config.upload_dir)?;

    // Connect to database
    let pool = db::create_pool(&config.database_url).await?;

    // Build router — serves frontend from ../frontend relative to backend/
    let frontend_dir = std::env::var("FRONTEND_DIR")
        .unwrap_or_else(|_| "../frontend".to_string());

    let app = routes::build_router(pool, &frontend_dir, &config.upload_dir);

    let addr: SocketAddr = format!("{}:{}", config.host, config.port).parse()?;
    tracing::info!("Server listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
