use axum::{
    extract::{Multipart, Path, State},
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    models::site::{CreateSite, Site, UpdateSite},
};

pub async fn list_sites(State(pool): State<PgPool>) -> Result<Json<Vec<Site>>> {
    let sites = sqlx::query_as::<_, Site>(
        "SELECT * FROM public.sites ORDER BY name ASC"
    )
    .fetch_all(&pool)
    .await?;
    Ok(Json(sites))
}

pub async fn get_site(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<Site>> {
    let site = sqlx::query_as::<_, Site>(
        "SELECT * FROM public.sites WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Site {} not found", id)))?;
    Ok(Json(site))
}

pub async fn create_site(
    State(pool): State<PgPool>,
    Json(body): Json<CreateSite>,
) -> Result<Json<Site>> {
    let site = sqlx::query_as::<_, Site>(
        r#"INSERT INTO public.sites
           (name, address, city, state, zip_code,
            shipping_address_street, shipping_address_city, shipping_address_state, shipping_address_zip,
            access_requirements, required_paperwork, orientation_info,
            customer_contact_phone, customer_contact_email, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
           RETURNING *"#,
    )
    .bind(&body.name)
    .bind(&body.address)
    .bind(&body.city)
    .bind(&body.state)
    .bind(&body.zip_code)
    .bind(&body.shipping_address_street)
    .bind(&body.shipping_address_city)
    .bind(&body.shipping_address_state)
    .bind(&body.shipping_address_zip)
    .bind(&body.access_requirements)
    .bind(&body.required_paperwork)
    .bind(&body.orientation_info)
    .bind(&body.customer_contact_phone)
    .bind(&body.customer_contact_email)
    .bind(&body.notes)
    .fetch_one(&pool)
    .await?;
    Ok(Json(site))
}

pub async fn update_site(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateSite>,
) -> Result<Json<Site>> {
    let site = sqlx::query_as::<_, Site>(
        r#"UPDATE public.sites SET
           name = COALESCE($2, name),
           address = COALESCE($3, address),
           city = COALESCE($4, city),
           state = COALESCE($5, state),
           zip_code = COALESCE($6, zip_code),
           shipping_address_street = COALESCE($7, shipping_address_street),
           shipping_address_city = COALESCE($8, shipping_address_city),
           shipping_address_state = COALESCE($9, shipping_address_state),
           shipping_address_zip = COALESCE($10, shipping_address_zip),
           access_requirements = COALESCE($11, access_requirements),
           required_paperwork = COALESCE($12, required_paperwork),
           orientation_info = COALESCE($13, orientation_info),
           customer_contact_phone = COALESCE($14, customer_contact_phone),
           customer_contact_email = COALESCE($15, customer_contact_email),
           notes = COALESCE($16, notes),
           updated_at = now()
           WHERE id = $1
           RETURNING *"#,
    )
    .bind(id)
    .bind(&body.name)
    .bind(&body.address)
    .bind(&body.city)
    .bind(&body.state)
    .bind(&body.zip_code)
    .bind(&body.shipping_address_street)
    .bind(&body.shipping_address_city)
    .bind(&body.shipping_address_state)
    .bind(&body.shipping_address_zip)
    .bind(&body.access_requirements)
    .bind(&body.required_paperwork)
    .bind(&body.orientation_info)
    .bind(&body.customer_contact_phone)
    .bind(&body.customer_contact_email)
    .bind(&body.notes)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Site {} not found", id)))?;
    Ok(Json(site))
}

pub async fn delete_site(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    sqlx::query("DELETE FROM public.sites WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await?;
    Ok(Json(serde_json::json!({ "deleted": id })))
}

pub async fn upload_logo(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    mut multipart: Multipart,
) -> Result<Json<Site>> {
    let upload_dir = std::env::var("UPLOAD_DIR").unwrap_or_else(|_| "./uploads".to_string());
    let logos_dir = format!("{}/logos", upload_dir);
    std::fs::create_dir_all(&logos_dir).map_err(|e| AppError::Internal(e.into()))?;

    let mut logo_url: Option<String> = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::Internal(anyhow::anyhow!(e)))? {
        if field.name().unwrap_or("") != "logo" { continue; }

        let content_type = field.content_type().unwrap_or("image/png").to_string();
        let ext = match content_type.as_str() {
            "image/jpeg" | "image/jpg" => "jpg",
            "image/gif" => "gif",
            "image/svg+xml" => "svg",
            "image/webp" => "webp",
            _ => "png",
        };

        let filename = format!("{}.{}", id, ext);
        let filepath = format!("{}/{}", logos_dir, filename);
        let bytes = field.bytes().await.map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;
        std::fs::write(&filepath, &bytes).map_err(|e| AppError::Internal(e.into()))?;
        logo_url = Some(format!("/uploads/logos/{}", filename));
        break;
    }

    let url = logo_url.ok_or_else(|| AppError::BadRequest("No 'logo' field in upload".to_string()))?;

    let site = sqlx::query_as::<_, Site>(
        "UPDATE public.sites SET logo_url = $2, updated_at = now() WHERE id = $1 RETURNING *"
    )
    .bind(id)
    .bind(&url)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Site {} not found", id)))?;

    Ok(Json(site))
}
