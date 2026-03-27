use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    models::ticket::{CreateTicket, CxAlloyImportBody, Ticket, UpdateTicket},
};

#[derive(Deserialize)]
#[allow(dead_code)]
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
            ticket_type, reported_by_type, title, description, status,
            unit_tag, unit_serial_number, parts_items,
            scope, num_techs, service_start_date, service_end_date)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'open',$9,$10,$11,$12,$13,$14,$15)
           RETURNING *"#,
    )
    .bind(body.site_id)
    .bind(body.unit_id)
    .bind(&body.astea_request_id)
    .bind(body.ticket_line_number.unwrap_or(1))
    .bind(body.ticket_type.as_deref().unwrap_or("cs_ticket"))
    .bind(body.reported_by_type.as_deref().unwrap_or("technician"))
    .bind(&body.title)
    .bind(&body.description)
    .bind(&body.unit_tag)
    .bind(&body.unit_serial_number)
    .bind(&body.parts_items)
    .bind(&body.scope)
    .bind(body.num_techs)
    .bind(body.service_start_date)
    .bind(body.service_end_date)
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
           unit_tag = COALESCE($9, unit_tag),
           unit_serial_number = COALESCE($10, unit_serial_number),
           parts_items = COALESCE($11, parts_items),
           scope = COALESCE($12, scope),
           num_techs = COALESCE($13, num_techs),
           service_start_date = COALESCE($14, service_start_date),
           service_end_date = COALESCE($15, service_end_date),
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
    .bind(&body.unit_tag)
    .bind(&body.unit_serial_number)
    .bind(&body.parts_items)
    .bind(&body.scope)
    .bind(body.num_techs)
    .bind(body.service_start_date)
    .bind(body.service_end_date)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Ticket {} not found", id)))?;
    Ok(Json(ticket))
}

pub async fn delete_ticket(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    sqlx::query("DELETE FROM public.issues WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await?;
    Ok(Json(serde_json::json!({ "deleted": id })))
}

pub async fn import_cxalloy_issues(
    State(pool): State<PgPool>,
    Path(site_id): Path<Uuid>,
    Json(body): Json<CxAlloyImportBody>,
) -> Result<Json<serde_json::Value>> {
    let mut imported: i64 = 0;
    let mut skipped: i64 = 0;

    for issue in &body.issues {
        let rows = sqlx::query(
            r#"INSERT INTO public.issues
               (site_id, cxalloy_issue_id, title, description, unit_tag, priority, status,
                reported_by, resolution_notes, closed_date, reported_date,
                cx_zone, cx_issue_type, cx_source, ticket_type)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,
                       $10::TIMESTAMPTZ, $11::TIMESTAMPTZ,
                       $12,$13,$14,'commissioning_issue')
               ON CONFLICT (cxalloy_issue_id) DO UPDATE SET
                 title            = EXCLUDED.title,
                 description      = EXCLUDED.description,
                 unit_tag         = EXCLUDED.unit_tag,
                 priority         = EXCLUDED.priority,
                 status           = EXCLUDED.status,
                 resolution_notes = EXCLUDED.resolution_notes,
                 closed_date      = EXCLUDED.closed_date,
                 cx_zone          = EXCLUDED.cx_zone,
                 cx_issue_type    = EXCLUDED.cx_issue_type,
                 cx_source        = EXCLUDED.cx_source"#,
        )
        .bind(site_id)
        .bind(&issue.cxalloy_issue_id)
        .bind(&issue.title)
        .bind(&issue.description)
        .bind(&issue.unit_tag)
        .bind(&issue.priority)
        .bind(&issue.status)
        .bind(&issue.reported_by)
        .bind(&issue.resolution_notes)
        .bind(&issue.closed_date)
        .bind(&issue.reported_date)
        .bind(&issue.cx_zone)
        .bind(&issue.cx_issue_type)
        .bind(&issue.cx_source)
        .execute(&pool)
        .await?
        .rows_affected();

        if rows > 0 { imported += 1; } else { skipped += 1; }
    }

    Ok(Json(serde_json::json!({ "imported": imported, "skipped": skipped })))
}
