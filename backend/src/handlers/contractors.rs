use axum::{
    extract::{Path, State},
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    models::contractor::{Contractor, CreateContractor, UpdateContractor},
};

pub async fn list_contractors(State(pool): State<PgPool>) -> Result<Json<Vec<Contractor>>> {
    let contractors = sqlx::query_as::<_, Contractor>(
        "SELECT * FROM public.contractors ORDER BY company_name ASC"
    )
    .fetch_all(&pool)
    .await?;
    Ok(Json(contractors))
}

pub async fn get_contractor(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<Contractor>> {
    let contractor = sqlx::query_as::<_, Contractor>(
        "SELECT * FROM public.contractors WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Contractor {} not found", id)))?;
    Ok(Json(contractor))
}

pub async fn create_contractor(
    State(pool): State<PgPool>,
    Json(body): Json<CreateContractor>,
) -> Result<Json<Contractor>> {
    let contractor = sqlx::query_as::<_, Contractor>(
        r#"INSERT INTO public.contractors
           (company_name, contact_name, title, email, phone, region, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           RETURNING *"#,
    )
    .bind(&body.company_name)
    .bind(&body.contact_name)
    .bind(&body.title)
    .bind(&body.email)
    .bind(&body.phone)
    .bind(&body.region)
    .bind(&body.notes)
    .fetch_one(&pool)
    .await?;

    // Insert specialties if provided
    if let Some(specialties) = &body.specialties {
        for s in specialties {
            sqlx::query(
                "INSERT INTO public.contractor_specialties (contractor_id, specialty) VALUES ($1, $2)"
            )
            .bind(contractor.id)
            .bind(s)
            .execute(&pool)
            .await?;
        }
    }

    Ok(Json(contractor))
}

pub async fn update_contractor(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateContractor>,
) -> Result<Json<Contractor>> {
    let contractor = sqlx::query_as::<_, Contractor>(
        r#"UPDATE public.contractors SET
           company_name = COALESCE($2, company_name),
           contact_name = COALESCE($3, contact_name),
           title = COALESCE($4, title),
           email = COALESCE($5, email),
           phone = COALESCE($6, phone),
           region = COALESCE($7, region),
           notes = COALESCE($8, notes),
           is_active = COALESCE($9, is_active),
           updated_at = now()
           WHERE id = $1
           RETURNING *"#,
    )
    .bind(id)
    .bind(&body.company_name)
    .bind(&body.contact_name)
    .bind(&body.title)
    .bind(&body.email)
    .bind(&body.phone)
    .bind(&body.region)
    .bind(&body.notes)
    .bind(body.is_active)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Contractor {} not found", id)))?;
    Ok(Json(contractor))
}

pub async fn delete_contractor(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    sqlx::query("DELETE FROM public.contractors WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await?;
    Ok(Json(serde_json::json!({ "deleted": id })))
}
