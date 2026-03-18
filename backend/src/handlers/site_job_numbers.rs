use axum::{
    extract::{Path, State},
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    models::site_job_number::{CreateSiteJobNumber, SiteJobNumber, UpdateSiteJobNumber},
};

pub async fn list_job_numbers(
    State(pool): State<PgPool>,
    Path(site_id): Path<Uuid>,
) -> Result<Json<Vec<SiteJobNumber>>> {
    let rows = sqlx::query_as::<_, SiteJobNumber>(
        "SELECT * FROM public.site_job_numbers WHERE site_id = $1 ORDER BY is_primary DESC NULLS LAST, created_at ASC"
    )
    .bind(site_id)
    .fetch_all(&pool)
    .await?;
    Ok(Json(rows))
}

pub async fn create_job_number(
    State(pool): State<PgPool>,
    Path(site_id): Path<Uuid>,
    Json(body): Json<CreateSiteJobNumber>,
) -> Result<Json<SiteJobNumber>> {
    let row = sqlx::query_as::<_, SiteJobNumber>(
        r#"INSERT INTO public.site_job_numbers (site_id, job_number, description, is_primary)
           VALUES ($1, $2, $3, $4) RETURNING *"#
    )
    .bind(site_id)
    .bind(&body.job_number)
    .bind(&body.description)
    .bind(body.is_primary.unwrap_or(false))
    .fetch_one(&pool)
    .await?;
    Ok(Json(row))
}

pub async fn update_job_number(
    State(pool): State<PgPool>,
    Path((site_id, job_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<UpdateSiteJobNumber>,
) -> Result<Json<SiteJobNumber>> {
    let row = sqlx::query_as::<_, SiteJobNumber>(
        r#"UPDATE public.site_job_numbers SET
           job_number = COALESCE($3, job_number),
           description = COALESCE($4, description),
           is_primary = COALESCE($5, is_primary)
           WHERE id = $1 AND site_id = $2 RETURNING *"#
    )
    .bind(job_id)
    .bind(site_id)
    .bind(&body.job_number)
    .bind(&body.description)
    .bind(body.is_primary)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Job number not found".to_string()))?;
    Ok(Json(row))
}

pub async fn delete_job_number(
    State(pool): State<PgPool>,
    Path((site_id, job_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<serde_json::Value>> {
    sqlx::query("DELETE FROM public.site_job_numbers WHERE id = $1 AND site_id = $2")
        .bind(job_id)
        .bind(site_id)
        .execute(&pool)
        .await?;
    Ok(Json(serde_json::json!({ "deleted": job_id })))
}
