use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    models::msow::{CreateMsowDraft, MsowDraft, UpdateMsowDraft},
};

#[derive(Deserialize)]
pub struct MsowFilter {
    pub site_id: Option<Uuid>,
}

pub async fn list_drafts(
    State(pool): State<PgPool>,
    Query(params): Query<MsowFilter>,
) -> Result<Json<Vec<MsowDraft>>> {
    let drafts = sqlx::query_as::<_, MsowDraft>(
        r#"SELECT d.* FROM public.msow_drafts d
           WHERE ($1::UUID IS NULL OR d.site_id = $1)
           ORDER BY d.updated_at DESC"#,
    )
    .bind(params.site_id)
    .fetch_all(&pool)
    .await?;
    Ok(Json(drafts))
}

pub async fn get_draft(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<MsowDraft>> {
    let draft = sqlx::query_as::<_, MsowDraft>(
        "SELECT * FROM public.msow_drafts WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("MSOW draft {} not found", id)))?;
    Ok(Json(draft))
}

pub async fn create_draft(
    State(pool): State<PgPool>,
    Json(body): Json<CreateMsowDraft>,
) -> Result<Json<MsowDraft>> {
    let name = body.name.unwrap_or_else(|| "Untitled MSOW".into());
    let draft = sqlx::query_as::<_, MsowDraft>(
        r#"INSERT INTO public.msow_drafts (site_id, name, form_data)
           VALUES ($1, $2, $3)
           RETURNING *"#,
    )
    .bind(body.site_id)
    .bind(&name)
    .bind(&body.form_data)
    .fetch_one(&pool)
    .await?;
    Ok(Json(draft))
}

pub async fn update_draft(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateMsowDraft>,
) -> Result<Json<MsowDraft>> {
    let draft = sqlx::query_as::<_, MsowDraft>(
        r#"UPDATE public.msow_drafts SET
           name      = COALESCE($2, name),
           form_data = COALESCE($3, form_data),
           updated_at = NOW()
           WHERE id = $1
           RETURNING *"#,
    )
    .bind(id)
    .bind(&body.name)
    .bind(&body.form_data)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("MSOW draft {} not found", id)))?;
    Ok(Json(draft))
}

pub async fn delete_draft(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    sqlx::query("DELETE FROM public.msow_drafts WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await?;
    Ok(Json(serde_json::json!({ "deleted": id })))
}
