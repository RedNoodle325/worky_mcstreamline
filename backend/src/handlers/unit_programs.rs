use axum::{
    extract::{Path, State},
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    models::unit_program::{CreateUnitProgram, UnitProgram, UpdateUnitProgram},
};

pub async fn list_programs(
    State(pool): State<PgPool>,
    Path(unit_id): Path<Uuid>,
) -> Result<Json<Vec<UnitProgram>>> {
    let rows = sqlx::query_as::<_, UnitProgram>(
        "SELECT * FROM public.unit_programs WHERE unit_id = $1 ORDER BY controller_name, install_date DESC",
    )
    .bind(unit_id)
    .fetch_all(&pool)
    .await?;
    Ok(Json(rows))
}

pub async fn create_program(
    State(pool): State<PgPool>,
    Path(unit_id): Path<Uuid>,
    Json(body): Json<CreateUnitProgram>,
) -> Result<Json<UnitProgram>> {
    let row = sqlx::query_as::<_, UnitProgram>(
        r#"INSERT INTO public.unit_programs
           (unit_id, controller_name, program_name, version, install_date, notes)
           VALUES ($1,$2,$3,$4,$5,$6)
           RETURNING *"#,
    )
    .bind(unit_id)
    .bind(&body.controller_name)
    .bind(&body.program_name)
    .bind(&body.version)
    .bind(body.install_date)
    .bind(&body.notes)
    .fetch_one(&pool)
    .await?;
    Ok(Json(row))
}

pub async fn update_program(
    State(pool): State<PgPool>,
    Path((unit_id, program_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<UpdateUnitProgram>,
) -> Result<Json<UnitProgram>> {
    let row = sqlx::query_as::<_, UnitProgram>(
        r#"UPDATE public.unit_programs SET
               controller_name = COALESCE($3, controller_name),
               program_name    = COALESCE($4, program_name),
               version         = COALESCE($5, version),
               install_date    = COALESCE($6, install_date),
               notes           = COALESCE($7, notes),
               updated_at      = now()
           WHERE id = $1 AND unit_id = $2
           RETURNING *"#,
    )
    .bind(program_id)
    .bind(unit_id)
    .bind(&body.controller_name)
    .bind(&body.program_name)
    .bind(&body.version)
    .bind(body.install_date)
    .bind(&body.notes)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Program {} not found", program_id)))?;
    Ok(Json(row))
}

pub async fn delete_program(
    State(pool): State<PgPool>,
    Path((unit_id, program_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<serde_json::Value>> {
    sqlx::query(
        "DELETE FROM public.unit_programs WHERE id = $1 AND unit_id = $2",
    )
    .bind(program_id)
    .bind(unit_id)
    .execute(&pool)
    .await?;
    Ok(Json(serde_json::json!({ "deleted": program_id })))
}
