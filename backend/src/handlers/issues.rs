use axum::{
    extract::{Path, State},
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    models::issue::{CreateIssue, Issue, UpdateIssue},
};

const SELECT_COLS: &str = r#"id, site_id, unit_id, ticket_type, title, description, status, priority,
                  unit_tag, reported_by, resolution_notes, reported_date, closed_date,
                  cxalloy_issue_id, cxalloy_url, cx_zone, cx_issue_type, cx_source, service_ticket_id,
                  created_at, updated_at"#;

pub async fn list_site_issues(
    State(pool): State<PgPool>,
    Path(site_id): Path<Uuid>,
) -> Result<Json<Vec<Issue>>> {
    let sql = format!(
        "SELECT {} FROM public.issues WHERE site_id = $1 ORDER BY reported_date DESC NULLS LAST, created_at DESC",
        SELECT_COLS
    );
    let issues = sqlx::query_as::<_, Issue>(&sql)
        .bind(site_id)
        .fetch_all(&pool)
        .await?;
    Ok(Json(issues))
}

pub async fn list_unit_issues(
    State(pool): State<PgPool>,
    Path(unit_id): Path<Uuid>,
) -> Result<Json<Vec<Issue>>> {
    let sql = format!(
        "SELECT {} FROM public.issues WHERE unit_id = $1 ORDER BY reported_date DESC NULLS LAST, created_at DESC",
        SELECT_COLS
    );
    let issues = sqlx::query_as::<_, Issue>(&sql)
        .bind(unit_id)
        .fetch_all(&pool)
        .await?;
    Ok(Json(issues))
}

pub async fn list_all_issues(
    State(pool): State<PgPool>,
) -> Result<Json<Vec<Issue>>> {
    let sql = format!(
        "SELECT {} FROM public.issues ORDER BY reported_date DESC NULLS LAST, created_at DESC",
        SELECT_COLS
    );
    let issues = sqlx::query_as::<_, Issue>(&sql)
        .fetch_all(&pool)
        .await?;
    Ok(Json(issues))
}

pub async fn create_issue(
    State(pool): State<PgPool>,
    Json(body): Json<CreateIssue>,
) -> Result<Json<Issue>> {
    let sql = format!(
        r#"INSERT INTO public.issues
           (site_id, unit_id, title, description, unit_tag, priority, status,
            reported_by, resolution_notes, cx_zone, cx_issue_type, cx_source,
            cxalloy_url, reported_date, closed_date, ticket_type, service_ticket_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
                   $14::TIMESTAMPTZ, $15::TIMESTAMPTZ, COALESCE($16, 'field_service'), $17)
           RETURNING {}"#,
        SELECT_COLS
    );
    let issue = sqlx::query_as::<_, Issue>(&sql)
        .bind(body.site_id)
        .bind(body.unit_id)
        .bind(&body.title)
        .bind(&body.description)
        .bind(&body.unit_tag)
        .bind(body.priority.as_deref().unwrap_or("low"))
        .bind(body.status.as_deref().unwrap_or("open"))
        .bind(&body.reported_by)
        .bind(&body.resolution_notes)
        .bind(&body.cx_zone)
        .bind(&body.cx_issue_type)
        .bind(&body.cx_source)
        .bind(&body.cxalloy_url)
        .bind(body.reported_date.as_deref())
        .bind(body.closed_date.as_deref())
        .bind(&body.ticket_type)
        .bind(body.service_ticket_id)
        .fetch_one(&pool)
        .await?;
    Ok(Json(issue))
}

pub async fn update_issue(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateIssue>,
) -> Result<Json<Issue>> {
    let sql = format!(
        r#"UPDATE public.issues SET
           unit_id           = COALESCE($2, unit_id),
           title             = COALESCE($3, title),
           description       = COALESCE($4, description),
           status            = COALESCE($5, status),
           priority          = COALESCE($6, priority),
           unit_tag          = COALESCE($7, unit_tag),
           resolution_notes  = COALESCE($8, resolution_notes),
           closed_date       = COALESCE($9::TIMESTAMPTZ, closed_date),
           cx_zone           = COALESCE($10, cx_zone),
           cx_issue_type     = COALESCE($11, cx_issue_type),
           service_ticket_id = COALESCE($12, service_ticket_id),
           cxalloy_url       = COALESCE($13, cxalloy_url),
           updated_at        = now()
           WHERE id = $1
           RETURNING {}"#,
        SELECT_COLS
    );
    let issue = sqlx::query_as::<_, Issue>(&sql)
        .bind(id)
        .bind(body.unit_id)
        .bind(&body.title)
        .bind(&body.description)
        .bind(&body.status)
        .bind(&body.priority)
        .bind(&body.unit_tag)
        .bind(&body.resolution_notes)
        .bind(body.closed_date.as_deref())
        .bind(&body.cx_zone)
        .bind(&body.cx_issue_type)
        .bind(body.service_ticket_id)
        .bind(&body.cxalloy_url)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Issue {} not found", id)))?;
    Ok(Json(issue))
}

pub async fn delete_issue(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    sqlx::query("DELETE FROM public.issues WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await?;
    Ok(Json(serde_json::json!({ "deleted": id })))
}
