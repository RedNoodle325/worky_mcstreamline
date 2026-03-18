use axum::{
    extract::{Path, State},
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    models::warranty::{CreateWarrantyClaim, UpdateWarrantyClaim, WarrantyClaim},
};

pub async fn list_warranty_claims(State(pool): State<PgPool>) -> Result<Json<Vec<WarrantyClaim>>> {
    let claims = sqlx::query_as::<_, WarrantyClaim>(
        "SELECT * FROM public.warranty_claims ORDER BY created_at DESC"
    )
    .fetch_all(&pool)
    .await?;
    Ok(Json(claims))
}

pub async fn get_warranty_claim(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<WarrantyClaim>> {
    let claim = sqlx::query_as::<_, WarrantyClaim>(
        "SELECT * FROM public.warranty_claims WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Warranty claim {} not found", id)))?;
    Ok(Json(claim))
}

pub async fn create_warranty_claim(
    State(pool): State<PgPool>,
    Json(body): Json<CreateWarrantyClaim>,
) -> Result<Json<WarrantyClaim>> {
    let claim = sqlx::query_as::<_, WarrantyClaim>(
        r#"INSERT INTO public.warranty_claims
           (unit_id, site_id, issue_id, astea_request_id, description, status)
           VALUES ($1,$2,$3,$4,$5,'submitted')
           RETURNING *"#,
    )
    .bind(body.unit_id)
    .bind(body.site_id)
    .bind(body.issue_id)
    .bind(&body.astea_request_id)
    .bind(&body.description)
    .fetch_one(&pool)
    .await?;
    Ok(Json(claim))
}

pub async fn update_warranty_claim(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateWarrantyClaim>,
) -> Result<Json<WarrantyClaim>> {
    let claim = sqlx::query_as::<_, WarrantyClaim>(
        r#"UPDATE public.warranty_claims SET
           status = COALESCE($2, status),
           resolution = COALESCE($3, resolution),
           closed_date = COALESCE($4, closed_date),
           astea_request_id = COALESCE($5, astea_request_id),
           updated_at = now()
           WHERE id = $1
           RETURNING *"#,
    )
    .bind(id)
    .bind(&body.status)
    .bind(&body.resolution)
    .bind(body.closed_date)
    .bind(&body.astea_request_id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Warranty claim {} not found", id)))?;
    Ok(Json(claim))
}

pub async fn delete_warranty_claim(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    sqlx::query("DELETE FROM public.warranty_claims WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await?;
    Ok(Json(serde_json::json!({ "deleted": id })))
}
