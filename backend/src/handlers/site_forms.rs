use axum::{
    extract::{Path, State},
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    models::site_form::{CreateSiteForm, SiteFormTemplate, UpdateSiteForm},
};

pub async fn list_forms(
    State(pool): State<PgPool>,
    Path(site_id): Path<Uuid>,
) -> Result<Json<Vec<SiteFormTemplate>>> {
    let forms = sqlx::query_as::<_, SiteFormTemplate>(
        "SELECT * FROM public.site_form_templates WHERE site_id = $1 ORDER BY category, name"
    )
    .bind(site_id)
    .fetch_all(&pool)
    .await?;
    Ok(Json(forms))
}

pub async fn create_form(
    State(pool): State<PgPool>,
    Path(site_id): Path<Uuid>,
    Json(body): Json<CreateSiteForm>,
) -> Result<Json<SiteFormTemplate>> {
    let form = sqlx::query_as::<_, SiteFormTemplate>(
        r#"INSERT INTO public.site_form_templates (site_id, name, description, category, url)
           VALUES ($1, $2, $3, $4, $5) RETURNING *"#
    )
    .bind(site_id)
    .bind(&body.name)
    .bind(&body.description)
    .bind(body.category.as_deref().unwrap_or("general"))
    .bind(&body.url)
    .fetch_one(&pool)
    .await?;
    Ok(Json(form))
}

pub async fn update_form(
    State(pool): State<PgPool>,
    Path((site_id, form_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<UpdateSiteForm>,
) -> Result<Json<SiteFormTemplate>> {
    let form = sqlx::query_as::<_, SiteFormTemplate>(
        r#"UPDATE public.site_form_templates SET
           name = COALESCE($3, name),
           description = COALESCE($4, description),
           category = COALESCE($5, category),
           url = COALESCE($6, url),
           updated_at = now()
           WHERE id = $1 AND site_id = $2 RETURNING *"#
    )
    .bind(form_id)
    .bind(site_id)
    .bind(&body.name)
    .bind(&body.description)
    .bind(&body.category)
    .bind(&body.url)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Form template not found".to_string()))?;
    Ok(Json(form))
}

pub async fn delete_form(
    State(pool): State<PgPool>,
    Path((site_id, form_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<serde_json::Value>> {
    sqlx::query("DELETE FROM public.site_form_templates WHERE id = $1 AND site_id = $2")
        .bind(form_id)
        .bind(site_id)
        .execute(&pool)
        .await?;
    Ok(Json(serde_json::json!({ "deleted": form_id })))
}
