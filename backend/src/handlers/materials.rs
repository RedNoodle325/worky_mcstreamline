use axum::{
    extract::{Path, State},
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    models::material::{CreateMaterial, MaterialHistory, UpdateMaterial},
};

pub async fn list_unit_materials(
    State(pool): State<PgPool>,
    Path(unit_id): Path<Uuid>,
) -> Result<Json<Vec<MaterialHistory>>> {
    let materials = sqlx::query_as::<_, MaterialHistory>(
        r#"SELECT id, unit_id, part_number, description, quantity, date, notes, created_at
           FROM public.material_history
           WHERE unit_id = $1
           ORDER BY date DESC NULLS LAST, created_at DESC"#,
    )
    .bind(unit_id)
    .fetch_all(&pool)
    .await?;
    Ok(Json(materials))
}

pub async fn create_material(
    State(pool): State<PgPool>,
    Path(unit_id): Path<Uuid>,
    Json(body): Json<CreateMaterial>,
) -> Result<Json<MaterialHistory>> {
    let material = sqlx::query_as::<_, MaterialHistory>(
        r#"INSERT INTO public.material_history
           (unit_id, part_number, description, quantity, date, notes)
           VALUES ($1, $2, $3, $4, $5::DATE, $6)
           RETURNING id, unit_id, part_number, description, quantity, date, notes, created_at"#,
    )
    .bind(unit_id)
    .bind(&body.part_number)
    .bind(&body.description)
    .bind(body.quantity.unwrap_or(1))
    .bind(body.date.as_deref())
    .bind(&body.notes)
    .fetch_one(&pool)
    .await?;
    Ok(Json(material))
}

pub async fn update_material(
    State(pool): State<PgPool>,
    Path((_unit_id, id)): Path<(Uuid, Uuid)>,
    Json(body): Json<UpdateMaterial>,
) -> Result<Json<MaterialHistory>> {
    let material = sqlx::query_as::<_, MaterialHistory>(
        r#"UPDATE public.material_history SET
           part_number = COALESCE($2, part_number),
           description = COALESCE($3, description),
           quantity    = COALESCE($4, quantity),
           date        = COALESCE($5::DATE, date),
           notes       = COALESCE($6, notes)
           WHERE id = $1
           RETURNING id, unit_id, part_number, description, quantity, date, notes, created_at"#,
    )
    .bind(id)
    .bind(&body.part_number)
    .bind(&body.description)
    .bind(body.quantity)
    .bind(body.date.as_deref())
    .bind(&body.notes)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Material {} not found", id)))?;
    Ok(Json(material))
}

pub async fn delete_material(
    State(pool): State<PgPool>,
    Path((_unit_id, id)): Path<(Uuid, Uuid)>,
) -> Result<Json<serde_json::Value>> {
    sqlx::query("DELETE FROM public.material_history WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await?;
    Ok(Json(serde_json::json!({ "deleted": id })))
}
