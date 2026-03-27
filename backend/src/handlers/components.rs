use axum::{
    extract::{Path, State},
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    models::component::{
        ComponentUpdate, CreateComponent, CreateComponentUpdate,
        UpdateComponent, UpdateComponentUpdate, UnitComponent,
    },
};

// ── Components ─────────────────────────────────────────────────────────────

pub async fn list_components(
    State(pool): State<PgPool>,
    Path(unit_id): Path<Uuid>,
) -> Result<Json<Vec<UnitComponent>>> {
    let rows = sqlx::query_as::<_, UnitComponent>(
        r#"SELECT id, unit_id, name, model, serial_number, installed_date, notes, created_at
           FROM public.unit_components
           WHERE unit_id = $1
           ORDER BY created_at ASC"#,
    )
    .bind(unit_id)
    .fetch_all(&pool)
    .await?;
    Ok(Json(rows))
}

pub async fn create_component(
    State(pool): State<PgPool>,
    Path(unit_id): Path<Uuid>,
    Json(body): Json<CreateComponent>,
) -> Result<Json<UnitComponent>> {
    let row = sqlx::query_as::<_, UnitComponent>(
        r#"INSERT INTO public.unit_components
           (unit_id, name, model, serial_number, installed_date, notes)
           VALUES ($1, $2, $3, $4, $5::DATE, $6)
           RETURNING id, unit_id, name, model, serial_number, installed_date, notes, created_at"#,
    )
    .bind(unit_id)
    .bind(&body.name)
    .bind(&body.model)
    .bind(&body.serial_number)
    .bind(body.installed_date.as_deref())
    .bind(&body.notes)
    .fetch_one(&pool)
    .await?;
    Ok(Json(row))
}

pub async fn update_component(
    State(pool): State<PgPool>,
    Path((_unit_id, id)): Path<(Uuid, Uuid)>,
    Json(body): Json<UpdateComponent>,
) -> Result<Json<UnitComponent>> {
    let row = sqlx::query_as::<_, UnitComponent>(
        r#"UPDATE public.unit_components SET
           name          = COALESCE($2, name),
           model         = COALESCE($3, model),
           serial_number = COALESCE($4, serial_number),
           installed_date = COALESCE($5::DATE, installed_date),
           notes         = COALESCE($6, notes)
           WHERE id = $1
           RETURNING id, unit_id, name, model, serial_number, installed_date, notes, created_at"#,
    )
    .bind(id)
    .bind(&body.name)
    .bind(&body.model)
    .bind(&body.serial_number)
    .bind(body.installed_date.as_deref())
    .bind(&body.notes)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Component {} not found", id)))?;
    Ok(Json(row))
}

pub async fn delete_component(
    State(pool): State<PgPool>,
    Path((_unit_id, id)): Path<(Uuid, Uuid)>,
) -> Result<Json<serde_json::Value>> {
    sqlx::query("DELETE FROM public.unit_components WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await?;
    Ok(Json(serde_json::json!({ "deleted": id })))
}

// ── Component Updates ──────────────────────────────────────────────────────

pub async fn list_component_updates(
    State(pool): State<PgPool>,
    Path(component_id): Path<Uuid>,
) -> Result<Json<Vec<ComponentUpdate>>> {
    let rows = sqlx::query_as::<_, ComponentUpdate>(
        r#"SELECT id, component_id, description, performed_by, date, created_at
           FROM public.component_updates
           WHERE component_id = $1
           ORDER BY date DESC NULLS LAST, created_at DESC"#,
    )
    .bind(component_id)
    .fetch_all(&pool)
    .await?;
    Ok(Json(rows))
}

pub async fn create_component_update(
    State(pool): State<PgPool>,
    Path(component_id): Path<Uuid>,
    Json(body): Json<CreateComponentUpdate>,
) -> Result<Json<ComponentUpdate>> {
    let row = sqlx::query_as::<_, ComponentUpdate>(
        r#"INSERT INTO public.component_updates
           (component_id, description, performed_by, date)
           VALUES ($1, $2, $3, $4::DATE)
           RETURNING id, component_id, description, performed_by, date, created_at"#,
    )
    .bind(component_id)
    .bind(&body.description)
    .bind(&body.performed_by)
    .bind(body.date.as_deref())
    .fetch_one(&pool)
    .await?;
    Ok(Json(row))
}

pub async fn update_component_update(
    State(pool): State<PgPool>,
    Path((_comp_id, id)): Path<(Uuid, Uuid)>,
    Json(body): Json<UpdateComponentUpdate>,
) -> Result<Json<ComponentUpdate>> {
    let row = sqlx::query_as::<_, ComponentUpdate>(
        r#"UPDATE public.component_updates SET
           description  = COALESCE($2, description),
           performed_by = COALESCE($3, performed_by),
           date         = COALESCE($4::DATE, date)
           WHERE id = $1
           RETURNING id, component_id, description, performed_by, date, created_at"#,
    )
    .bind(id)
    .bind(&body.description)
    .bind(&body.performed_by)
    .bind(body.date.as_deref())
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Update {} not found", id)))?;
    Ok(Json(row))
}

pub async fn delete_component_update(
    State(pool): State<PgPool>,
    Path((_comp_id, id)): Path<(Uuid, Uuid)>,
) -> Result<Json<serde_json::Value>> {
    sqlx::query("DELETE FROM public.component_updates WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await?;
    Ok(Json(serde_json::json!({ "deleted": id })))
}
