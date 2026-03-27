use sqlx::{postgres::{PgConnectOptions, PgPoolOptions}, PgPool};
use anyhow::Result;
use std::str::FromStr;

pub async fn create_pool(database_url: &str) -> Result<PgPool> {
    let connect_options = PgConnectOptions::from_str(database_url)?
        .statement_cache_capacity(0); // required for PgBouncer session-mode pooler

    let pool = PgPoolOptions::new()
        .max_connections(5) // stay under Supabase session-mode pool_size limit
        .connect_with(connect_options)
        .await?;
    tracing::info!("Database connection pool created");

    run_migrations(&pool).await?;

    Ok(pool)
}

async fn run_migrations(pool: &PgPool) -> Result<()> {
    sqlx::query("ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS astea_site_id TEXT")
        .execute(pool).await?;

    // Issue ↔ service-line many-to-many
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS public.issue_line_links (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            issue_id        UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
            service_ticket_id UUID NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
            order_id        TEXT NOT NULL,
            created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
        )"
    ).execute(pool).await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_issue_line_links_issue ON public.issue_line_links(issue_id)").execute(pool).await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_issue_line_links_ticket ON public.issue_line_links(service_ticket_id)").execute(pool).await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_issue_line_links_order ON public.issue_line_links(order_id)").execute(pool).await?;
    sqlx::query("CREATE UNIQUE INDEX IF NOT EXISTS idx_issue_line_links_unique ON public.issue_line_links(issue_id, order_id)").execute(pool).await?;

    // Scope of work on service tickets
    sqlx::query("ALTER TABLE public.service_tickets ADD COLUMN IF NOT EXISTS scope_of_work TEXT")
        .execute(pool).await?;

    tracing::info!("Migrations applied");
    Ok(())
}
