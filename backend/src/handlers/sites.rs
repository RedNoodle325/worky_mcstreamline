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
    let mut tx = pool.begin().await?;

    let site = sqlx::query_as::<_, Site>(
        r#"INSERT INTO public.sites
           (project_number, project_name, customer_name, name,
            address, city, state, zip_code,
            point_of_contact, poc_phone, poc_email,
            customer_contact_name, customer_contact_phone, customer_contact_email,
            shipping_name, shipping_contact_name, shipping_contact_phone,
            shipping_address_street, shipping_address_city, shipping_address_state, shipping_address_zip,
            access_requirements, required_paperwork, orientation_info,
            notes, active, project_manager_id, astea_site_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
           RETURNING *"#,
    )
    .bind(&body.project_number)
    .bind(&body.project_name)
    .bind(&body.customer_name)
    .bind(&body.name)
    .bind(&body.address)
    .bind(&body.city)
    .bind(&body.state)
    .bind(&body.zip_code)
    .bind(&body.point_of_contact)
    .bind(&body.poc_phone)
    .bind(&body.poc_email)
    .bind(&body.customer_contact_name)
    .bind(&body.customer_contact_phone)
    .bind(&body.customer_contact_email)
    .bind(&body.shipping_name)
    .bind(&body.shipping_contact_name)
    .bind(&body.shipping_contact_phone)
    .bind(&body.shipping_address_street)
    .bind(&body.shipping_address_city)
    .bind(&body.shipping_address_state)
    .bind(&body.shipping_address_zip)
    .bind(&body.access_requirements)
    .bind(&body.required_paperwork)
    .bind(&body.orientation_info)
    .bind(&body.notes)
    .bind(&body.active)
    .bind(&body.project_manager_id)
    .bind(&body.astea_site_id)
    .fetch_one(&mut *tx)
    .await?;

    for jn in &body.job_numbers {
        sqlx::query(
            r#"INSERT INTO public.site_job_numbers (site_id, job_number, description, is_primary)
               VALUES ($1, $2, $3, $4)"#,
        )
        .bind(site.id)
        .bind(&jn.job_number)
        .bind(&jn.description)
        .bind(jn.is_primary.unwrap_or(false))
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(Json(site))
}

pub async fn update_site(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateSite>,
) -> Result<Json<Site>> {
    let site = sqlx::query_as::<_, Site>(
        r#"UPDATE public.sites SET
           project_number = COALESCE($2, project_number),
           project_name = COALESCE($3, project_name),
           customer_name = COALESCE($4, customer_name),
           name = COALESCE($5, name),
           address = COALESCE($6, address),
           city = COALESCE($7, city),
           state = COALESCE($8, state),
           zip_code = COALESCE($9, zip_code),
           point_of_contact = COALESCE($10, point_of_contact),
           poc_phone = COALESCE($11, poc_phone),
           poc_email = COALESCE($12, poc_email),
           customer_contact_name = COALESCE($13, customer_contact_name),
           customer_contact_phone = COALESCE($14, customer_contact_phone),
           customer_contact_email = COALESCE($15, customer_contact_email),
           shipping_name = COALESCE($16, shipping_name),
           shipping_contact_name = COALESCE($17, shipping_contact_name),
           shipping_contact_phone = COALESCE($18, shipping_contact_phone),
           shipping_address_street = COALESCE($19, shipping_address_street),
           shipping_address_city = COALESCE($20, shipping_address_city),
           shipping_address_state = COALESCE($21, shipping_address_state),
           shipping_address_zip = COALESCE($22, shipping_address_zip),
           access_requirements = COALESCE($23, access_requirements),
           required_paperwork = COALESCE($24, required_paperwork),
           orientation_info = COALESCE($25, orientation_info),
           notes = COALESCE($26, notes),
           last_contact_date = COALESCE($27, last_contact_date),
           techs_on_site = COALESCE($28, techs_on_site),
           active = COALESCE($29, active),
           project_manager_id = COALESCE($30, project_manager_id),
           lifecycle_phase = COALESCE($31, lifecycle_phase),
           site_status = COALESCE($32, site_status),
           warranty_start_date = COALESCE($33::DATE, warranty_start_date),
           warranty_end_date = COALESCE($34::DATE, warranty_end_date),
           extended_warranty_start = COALESCE($35::DATE, extended_warranty_start),
           extended_warranty_end = COALESCE($36::DATE, extended_warranty_end),
           astea_site_id = COALESCE($37, astea_site_id),
           updated_at = now()
           WHERE id = $1
           RETURNING *"#,
    )
    .bind(id)
    .bind(&body.project_number)
    .bind(&body.project_name)
    .bind(&body.customer_name)
    .bind(&body.name)
    .bind(&body.address)
    .bind(&body.city)
    .bind(&body.state)
    .bind(&body.zip_code)
    .bind(&body.point_of_contact)
    .bind(&body.poc_phone)
    .bind(&body.poc_email)
    .bind(&body.customer_contact_name)
    .bind(&body.customer_contact_phone)
    .bind(&body.customer_contact_email)
    .bind(&body.shipping_name)
    .bind(&body.shipping_contact_name)
    .bind(&body.shipping_contact_phone)
    .bind(&body.shipping_address_street)
    .bind(&body.shipping_address_city)
    .bind(&body.shipping_address_state)
    .bind(&body.shipping_address_zip)
    .bind(&body.access_requirements)
    .bind(&body.required_paperwork)
    .bind(&body.orientation_info)
    .bind(&body.notes)
    .bind(body.last_contact_date)
    .bind(body.techs_on_site)
    .bind(body.active)
    .bind(body.project_manager_id)
    .bind(&body.lifecycle_phase)
    .bind(&body.site_status)
    .bind(body.warranty_start_date)
    .bind(body.warranty_end_date)
    .bind(body.extended_warranty_start)
    .bind(body.extended_warranty_end)
    .bind(&body.astea_site_id)
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
