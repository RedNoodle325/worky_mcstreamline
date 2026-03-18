use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    models::ticket::{CreateTicket, Ticket, UpdateTicket},
};

#[derive(Deserialize)]
pub struct TicketFilter {
    pub site_id: Option<Uuid>,
    pub unit_id: Option<Uuid>,
    pub status: Option<String>,
}

pub async fn list_tickets(
    State(pool): State<PgPool>,
    Query(filter): Query<TicketFilter>,
) -> Result<Json<Vec<Ticket>>> {
    // Build dynamic query based on filters
    let tickets = match (filter.site_id, filter.unit_id) {
        (Some(site_id), _) => {
            sqlx::query_as::<_, Ticket>(
                "SELECT * FROM public.issues WHERE site_id = $1 ORDER BY created_at DESC"
            )
            .bind(site_id)
            .fetch_all(&pool)
            .await?
        }
        (_, Some(unit_id)) => {
            sqlx::query_as::<_, Ticket>(
                "SELECT * FROM public.issues WHERE unit_id = $1 ORDER BY created_at DESC"
            )
            .bind(unit_id)
            .fetch_all(&pool)
            .await?
        }
        _ => {
            sqlx::query_as::<_, Ticket>(
                "SELECT * FROM public.issues ORDER BY created_at DESC"
            )
            .fetch_all(&pool)
            .await?
        }
    };
    Ok(Json(tickets))
}

pub async fn get_ticket(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<Ticket>> {
    let ticket = sqlx::query_as::<_, Ticket>(
        "SELECT * FROM public.issues WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Ticket {} not found", id)))?;
    Ok(Json(ticket))
}

pub async fn create_ticket(
    State(pool): State<PgPool>,
    Json(body): Json<CreateTicket>,
) -> Result<Json<Ticket>> {
    let ticket = sqlx::query_as::<_, Ticket>(
        r#"INSERT INTO public.issues
           (site_id, unit_id, astea_request_id, ticket_line_number,
            ticket_type, reported_by_type, title, description, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'open')
           RETURNING *"#,
    )
    .bind(body.site_id)
    .bind(body.unit_id)
    .bind(&body.astea_request_id)
    .bind(body.ticket_line_number.unwrap_or(1))
    .bind(body.ticket_type.as_deref().unwrap_or("complaint"))
    .bind(body.reported_by_type.as_deref().unwrap_or("technician"))
    .bind(&body.title)
    .bind(&body.description)
    .fetch_one(&pool)
    .await?;
    Ok(Json(ticket))
}

pub async fn update_ticket(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateTicket>,
) -> Result<Json<Ticket>> {
    let ticket = sqlx::query_as::<_, Ticket>(
        r#"UPDATE public.issues SET
           astea_request_id = COALESCE($2, astea_request_id),
           status = COALESCE($3, status),
           parts_ordered = COALESCE($4, parts_ordered),
           tech_dispatched = COALESCE($5, tech_dispatched),
           resolution = COALESCE($6, resolution),
           title = COALESCE($7, title),
           description = COALESCE($8, description),
           updated_at = now(),
           resolved_at = CASE WHEN $3 = 'resolved' AND resolved_at IS NULL THEN now() ELSE resolved_at END
           WHERE id = $1
           RETURNING *"#,
    )
    .bind(id)
    .bind(&body.astea_request_id)
    .bind(&body.status)
    .bind(body.parts_ordered)
    .bind(body.tech_dispatched)
    .bind(&body.resolution)
    .bind(&body.title)
    .bind(&body.description)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Ticket {} not found", id)))?;
    Ok(Json(ticket))
}
