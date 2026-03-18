use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    models::unit::{CreateUnit, Unit, UpdateUnit},
};

#[derive(Deserialize)]
pub struct UnitFilter {
    pub site_id: Option<Uuid>,
    pub unit_type: Option<String>,
    pub commission_level: Option<String>,
}

pub async fn list_units(
    State(pool): State<PgPool>,
    Query(filter): Query<UnitFilter>,
) -> Result<Json<Vec<Unit>>> {
    let units = if let Some(site_id) = filter.site_id {
        sqlx::query_as::<_, Unit>(
            "SELECT * FROM public.units WHERE site_id = $1 ORDER BY job_number, line_number"
        )
        .bind(site_id)
        .fetch_all(&pool)
        .await?
    } else {
        sqlx::query_as::<_, Unit>(
            "SELECT * FROM public.units ORDER BY job_number, line_number"
        )
        .fetch_all(&pool)
        .await?
    };
    Ok(Json(units))
}

pub async fn get_unit(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<Unit>> {
    let unit = sqlx::query_as::<_, Unit>(
        "SELECT * FROM public.units WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Unit {} not found", id)))?;
    Ok(Json(unit))
}

pub async fn create_unit(
    State(pool): State<PgPool>,
    Json(body): Json<CreateUnit>,
) -> Result<Json<Unit>> {
    // serial = job_number-line_number
    let serial = format!("{}-{}", body.job_number, body.line_number);
    let unit = sqlx::query_as::<_, Unit>(
        r#"INSERT INTO public.units
           (site_id, job_number, line_number, serial_number, unit_type, model, description,
            warranty_start_date, warranty_end_date, notes, commission_level)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'none')
           RETURNING *"#,
    )
    .bind(body.site_id)
    .bind(&body.job_number)
    .bind(body.line_number)
    .bind(&serial)
    .bind(&body.unit_type)
    .bind(&body.model)
    .bind(&body.description)
    .bind(body.warranty_start_date)
    .bind(body.warranty_end_date)
    .bind(&body.notes)
    .fetch_one(&pool)
    .await?;
    Ok(Json(unit))
}

pub async fn update_unit(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateUnit>,
) -> Result<Json<Unit>> {
    let unit = sqlx::query_as::<_, Unit>(
        r#"UPDATE public.units SET
           unit_type = COALESCE($2, unit_type),
           model = COALESCE($3, model),
           description = COALESCE($4, description),
           commission_level = COALESCE($5, commission_level),
           warranty_start_date = COALESCE($6, warranty_start_date),
           warranty_end_date = COALESCE($7, warranty_end_date),
           notes = COALESCE($8, notes),
           updated_at = now()
           WHERE id = $1
           RETURNING *"#,
    )
    .bind(id)
    .bind(&body.unit_type)
    .bind(&body.model)
    .bind(&body.description)
    .bind(&body.commission_level)
    .bind(body.warranty_start_date)
    .bind(body.warranty_end_date)
    .bind(&body.notes)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Unit {} not found", id)))?;
    Ok(Json(unit))
}
