use axum::{extract::{Path, State}, Json};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::{AppError, Result};
use crate::models::issue_line_link::{IssueLineLink, CreateIssueLineLink, BulkLinkRequest};

/// List all links for a service ticket
pub async fn list_ticket_links(
    State(pool): State<PgPool>,
    Path(ticket_id): Path<Uuid>,
) -> Result<Json<Vec<IssueLineLink>>> {
    let links = sqlx::query_as::<_, IssueLineLink>(
        "SELECT id, issue_id, service_ticket_id, order_id, created_at
         FROM public.issue_line_links WHERE service_ticket_id = $1
         ORDER BY order_id, created_at"
    )
    .bind(ticket_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| AppError::Internal(e.into()))?;

    Ok(Json(links))
}

/// List all links (for client-side use — fetch all at once)
pub async fn list_all_links(
    State(pool): State<PgPool>,
) -> Result<Json<Vec<IssueLineLink>>> {
    let links = sqlx::query_as::<_, IssueLineLink>(
        "SELECT id, issue_id, service_ticket_id, order_id, created_at
         FROM public.issue_line_links ORDER BY created_at"
    )
    .fetch_all(&pool)
    .await
    .map_err(|e| AppError::Internal(e.into()))?;

    Ok(Json(links))
}

/// Link a single issue to a line on a ticket
pub async fn create_link(
    State(pool): State<PgPool>,
    Path(ticket_id): Path<Uuid>,
    Json(body): Json<CreateIssueLineLink>,
) -> Result<Json<IssueLineLink>> {
    let link = sqlx::query_as::<_, IssueLineLink>(
        "INSERT INTO public.issue_line_links (issue_id, service_ticket_id, order_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (issue_id, order_id) DO NOTHING
         RETURNING id, issue_id, service_ticket_id, order_id, created_at"
    )
    .bind(body.issue_id)
    .bind(ticket_id)
    .bind(&body.order_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| AppError::Internal(e.into()))?;

    Ok(Json(link))
}

/// Bulk-link multiple issues to a single line
pub async fn bulk_link(
    State(pool): State<PgPool>,
    Path(ticket_id): Path<Uuid>,
    Json(body): Json<BulkLinkRequest>,
) -> Result<Json<Vec<IssueLineLink>>> {
    let mut results = Vec::new();
    for issue_id in &body.issue_ids {
        let link = sqlx::query_as::<_, IssueLineLink>(
            "INSERT INTO public.issue_line_links (issue_id, service_ticket_id, order_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (issue_id, order_id) DO NOTHING
             RETURNING id, issue_id, service_ticket_id, order_id, created_at"
        )
        .bind(issue_id)
        .bind(ticket_id)
        .bind(&body.order_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| AppError::Internal(e.into()))?;

        if let Some(l) = link {
            results.push(l);
        }
    }
    Ok(Json(results))
}

/// Remove a link by ID
pub async fn delete_link(
    State(pool): State<PgPool>,
    Path((_ticket_id, link_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<serde_json::Value>> {
    sqlx::query("DELETE FROM public.issue_line_links WHERE id = $1")
        .bind(link_id)
        .execute(&pool)
        .await
        .map_err(|e| AppError::Internal(e.into()))?;

    Ok(Json(serde_json::json!({ "deleted": true })))
}
