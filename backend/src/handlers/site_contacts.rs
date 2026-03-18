use axum::{
    extract::{Path, State},
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    models::site_contact::{CreateSiteContact, SiteContact, UpdateSiteContact},
};

pub async fn list_contacts(
    State(pool): State<PgPool>,
    Path(site_id): Path<Uuid>,
) -> Result<Json<Vec<SiteContact>>> {
    let contacts = sqlx::query_as::<_, SiteContact>(
        "SELECT * FROM public.site_contacts WHERE site_id = $1 ORDER BY sort_order, created_at"
    )
    .bind(site_id)
    .fetch_all(&pool)
    .await?;
    Ok(Json(contacts))
}

pub async fn create_contact(
    State(pool): State<PgPool>,
    Path(site_id): Path<Uuid>,
    Json(body): Json<CreateSiteContact>,
) -> Result<Json<SiteContact>> {
    let contact = sqlx::query_as::<_, SiteContact>(
        r#"INSERT INTO public.site_contacts (site_id, contact_type, name, role, phone, email, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *"#
    )
    .bind(site_id)
    .bind(body.contact_type.as_deref().unwrap_or("site_contact"))
    .bind(&body.name)
    .bind(&body.role)
    .bind(&body.phone)
    .bind(&body.email)
    .bind(&body.notes)
    .fetch_one(&pool)
    .await?;
    Ok(Json(contact))
}

pub async fn update_contact(
    State(pool): State<PgPool>,
    Path((site_id, contact_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<UpdateSiteContact>,
) -> Result<Json<SiteContact>> {
    let contact = sqlx::query_as::<_, SiteContact>(
        r#"UPDATE public.site_contacts SET
           contact_type = COALESCE($3, contact_type),
           name = COALESCE($4, name),
           role = COALESCE($5, role),
           phone = COALESCE($6, phone),
           email = COALESCE($7, email),
           notes = COALESCE($8, notes),
           updated_at = now()
           WHERE id = $1 AND site_id = $2 RETURNING *"#
    )
    .bind(contact_id)
    .bind(site_id)
    .bind(&body.contact_type)
    .bind(&body.name)
    .bind(&body.role)
    .bind(&body.phone)
    .bind(&body.email)
    .bind(&body.notes)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Contact not found".to_string()))?;
    Ok(Json(contact))
}

pub async fn delete_contact(
    State(pool): State<PgPool>,
    Path((site_id, contact_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<serde_json::Value>> {
    sqlx::query("DELETE FROM public.site_contacts WHERE id = $1 AND site_id = $2")
        .bind(contact_id)
        .bind(site_id)
        .execute(&pool)
        .await?;
    Ok(Json(serde_json::json!({ "deleted": contact_id })))
}
