use axum::{
    extract::{Path, Query, State},
    Json,
};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::{AppError, Result};

// ── Technician models ────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Technician {
    pub id: Uuid,
    pub name: String,
    pub location_city: Option<String>,
    pub location_state: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub is_active: bool,
    pub notes: Option<String>,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
    pub updated_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTechnician {
    pub name: String,
    pub location_city: Option<String>,
    pub location_state: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub is_active: Option<bool>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTechnician {
    pub name: Option<String>,
    pub location_city: Option<String>,
    pub location_state: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub is_active: Option<bool>,
    pub notes: Option<String>,
}

// ── JobSchedule models ────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct JobSchedule {
    pub id: Uuid,
    pub site_id: Option<Uuid>,
    pub pm_id: Option<Uuid>,
    pub job_name: String,
    pub job_type: String,
    pub contract_number: Option<String>,
    pub priority: i32,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub status: String,
    pub notes: Option<String>,
    pub scope: Option<String>,
    pub techs_needed: i32,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
    pub updated_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateJobSchedule {
    pub site_id: Option<Uuid>,
    pub pm_id: Option<Uuid>,
    pub job_name: String,
    pub job_type: Option<String>,
    pub contract_number: Option<String>,
    pub priority: Option<i32>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub status: Option<String>,
    pub notes: Option<String>,
    pub scope: Option<String>,
    pub techs_needed: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateJobSchedule {
    pub site_id: Option<Uuid>,
    pub pm_id: Option<Uuid>,
    pub job_name: Option<String>,
    pub job_type: Option<String>,
    pub contract_number: Option<String>,
    pub priority: Option<i32>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub status: Option<String>,
    pub notes: Option<String>,
    pub scope: Option<String>,
    pub techs_needed: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct JobTechAssignment {
    pub technician_id: Uuid,
}

// ── Query params ─────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct ListJobsParams {
    pub week_start: Option<NaiveDate>,
}

// ── Dispatch response ─────────────────────────────────────────────────────────

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct TechWithDistance {
    pub id: Uuid,
    pub name: String,
    pub location_city: Option<String>,
    pub location_state: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub is_active: bool,
    pub notes: Option<String>,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
    pub updated_at: Option<chrono::DateTime<chrono::Utc>>,
    pub distance_miles: Option<f64>,
    pub has_pto: bool,
}

// ── Technician handlers ───────────────────────────────────────────────────────

pub async fn list_technicians(
    State(pool): State<PgPool>,
) -> Result<Json<Vec<Technician>>> {
    let techs = sqlx::query_as::<_, Technician>(
        "SELECT * FROM public.technicians ORDER BY name ASC",
    )
    .fetch_all(&pool)
    .await?;
    Ok(Json(techs))
}

pub async fn create_technician(
    State(pool): State<PgPool>,
    Json(body): Json<CreateTechnician>,
) -> Result<Json<Technician>> {
    let tech = sqlx::query_as::<_, Technician>(
        r#"INSERT INTO public.technicians
           (name, location_city, location_state, latitude, longitude, is_active, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *"#,
    )
    .bind(&body.name)
    .bind(&body.location_city)
    .bind(&body.location_state)
    .bind(body.latitude)
    .bind(body.longitude)
    .bind(body.is_active.unwrap_or(true))
    .bind(&body.notes)
    .fetch_one(&pool)
    .await?;
    Ok(Json(tech))
}

pub async fn update_technician(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateTechnician>,
) -> Result<Json<Technician>> {
    let tech = sqlx::query_as::<_, Technician>(
        r#"UPDATE public.technicians SET
           name           = COALESCE($2, name),
           location_city  = COALESCE($3, location_city),
           location_state = COALESCE($4, location_state),
           latitude       = COALESCE($5, latitude),
           longitude      = COALESCE($6, longitude),
           is_active      = COALESCE($7, is_active),
           notes          = COALESCE($8, notes),
           updated_at     = NOW()
           WHERE id = $1
           RETURNING *"#,
    )
    .bind(id)
    .bind(&body.name)
    .bind(&body.location_city)
    .bind(&body.location_state)
    .bind(body.latitude)
    .bind(body.longitude)
    .bind(body.is_active)
    .bind(&body.notes)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Technician {} not found", id)))?;
    Ok(Json(tech))
}

pub async fn delete_technician(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    sqlx::query("DELETE FROM public.technicians WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await?;
    Ok(Json(serde_json::json!({ "deleted": id })))
}

// ── Job schedule handlers ─────────────────────────────────────────────────────

pub async fn list_jobs(
    State(pool): State<PgPool>,
    Query(params): Query<ListJobsParams>,
) -> Result<Json<Vec<JobSchedule>>> {
    let jobs = if let Some(week_start) = params.week_start {
        // Return jobs that overlap with the 7-day window starting at week_start
        sqlx::query_as::<_, JobSchedule>(
            r#"SELECT * FROM public.job_schedule
               WHERE (start_date IS NULL OR start_date <= $1 + INTERVAL '6 days')
                 AND (end_date   IS NULL OR end_date   >= $1)
               ORDER BY start_date ASC NULLS LAST, job_name ASC"#,
        )
        .bind(week_start)
        .fetch_all(&pool)
        .await?
    } else {
        sqlx::query_as::<_, JobSchedule>(
            "SELECT * FROM public.job_schedule ORDER BY start_date ASC NULLS LAST, job_name ASC",
        )
        .fetch_all(&pool)
        .await?
    };
    Ok(Json(jobs))
}

pub async fn create_job(
    State(pool): State<PgPool>,
    Json(body): Json<CreateJobSchedule>,
) -> Result<Json<JobSchedule>> {
    let job = sqlx::query_as::<_, JobSchedule>(
        r#"INSERT INTO public.job_schedule
           (site_id, pm_id, job_name, job_type, contract_number, priority,
            start_date, end_date, status, notes, scope, techs_needed)
           VALUES ($1, $2, $3, COALESCE($4, 'Warranty'), $5, COALESCE($6, 3),
                   $7, $8, COALESCE($9, 'scheduled'), $10, $11, COALESCE($12, 1))
           RETURNING *"#,
    )
    .bind(body.site_id)
    .bind(body.pm_id)
    .bind(&body.job_name)
    .bind(&body.job_type)
    .bind(&body.contract_number)
    .bind(body.priority)
    .bind(body.start_date)
    .bind(body.end_date)
    .bind(&body.status)
    .bind(&body.notes)
    .bind(&body.scope)
    .bind(body.techs_needed)
    .fetch_one(&pool)
    .await?;
    Ok(Json(job))
}

pub async fn update_job(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateJobSchedule>,
) -> Result<Json<JobSchedule>> {
    let job = sqlx::query_as::<_, JobSchedule>(
        r#"UPDATE public.job_schedule SET
           site_id         = COALESCE($2, site_id),
           pm_id           = COALESCE($3, pm_id),
           job_name        = COALESCE($4, job_name),
           job_type        = COALESCE($5, job_type),
           contract_number = COALESCE($6, contract_number),
           priority        = COALESCE($7, priority),
           start_date      = COALESCE($8, start_date),
           end_date        = COALESCE($9, end_date),
           status          = COALESCE($10, status),
           notes           = COALESCE($11, notes),
           scope          = COALESCE($12, scope),
           techs_needed   = COALESCE($13, techs_needed),
           updated_at      = NOW()
           WHERE id = $1
           RETURNING *"#,
    )
    .bind(id)
    .bind(body.site_id)
    .bind(body.pm_id)
    .bind(&body.job_name)
    .bind(&body.job_type)
    .bind(&body.contract_number)
    .bind(body.priority)
    .bind(body.start_date)
    .bind(body.end_date)
    .bind(&body.status)
    .bind(&body.notes)
    .bind(&body.scope)
    .bind(body.techs_needed)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Job {} not found", id)))?;
    Ok(Json(job))
}

pub async fn delete_job(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    sqlx::query("DELETE FROM public.job_schedule WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await?;
    Ok(Json(serde_json::json!({ "deleted": id })))
}

// ── Job technician assignment handlers ────────────────────────────────────────

pub async fn list_job_techs(
    State(pool): State<PgPool>,
    Path(job_id): Path<Uuid>,
) -> Result<Json<Vec<Technician>>> {
    let techs = sqlx::query_as::<_, Technician>(
        r#"SELECT t.*
           FROM public.technicians t
           JOIN public.job_schedule_techs jt ON jt.technician_id = t.id
           WHERE jt.job_id = $1
           ORDER BY t.name ASC"#,
    )
    .bind(job_id)
    .fetch_all(&pool)
    .await?;
    Ok(Json(techs))
}

pub async fn assign_tech(
    State(pool): State<PgPool>,
    Path(job_id): Path<Uuid>,
    Json(body): Json<JobTechAssignment>,
) -> Result<Json<serde_json::Value>> {
    sqlx::query(
        r#"INSERT INTO public.job_schedule_techs (job_id, technician_id)
           VALUES ($1, $2)
           ON CONFLICT (job_id, technician_id) DO NOTHING"#,
    )
    .bind(job_id)
    .bind(body.technician_id)
    .execute(&pool)
    .await?;
    Ok(Json(serde_json::json!({ "job_id": job_id, "technician_id": body.technician_id })))
}

pub async fn remove_tech(
    State(pool): State<PgPool>,
    Path((job_id, tech_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<serde_json::Value>> {
    sqlx::query(
        "DELETE FROM public.job_schedule_techs WHERE job_id = $1 AND technician_id = $2",
    )
    .bind(job_id)
    .bind(tech_id)
    .execute(&pool)
    .await?;
    Ok(Json(serde_json::json!({ "job_id": job_id, "technician_id": tech_id })))
}

// ── Dispatch handler ──────────────────────────────────────────────────────────

pub async fn get_techs_for_site(
    State(pool): State<PgPool>,
    Path(site_id): Path<Uuid>,
) -> Result<Json<Vec<TechWithDistance>>> {
    // Fetch site coordinates — sites don't have lat/lng stored yet, so use NULL
    // This will work once site lat/lng columns are added.
    let site_row = sqlx::query!(
        "SELECT id FROM public.sites WHERE id = $1",
        site_id
    )
    .fetch_optional(&pool)
    .await?;

    if site_row.is_none() {
        return Err(AppError::NotFound(format!("Site {} not found", site_id)));
    }

    // site_lat / site_lng are NULL until we have coordinates on the sites table
    let site_lat: Option<f64> = None;
    let site_lng: Option<f64> = None;

    let techs = sqlx::query_as::<_, TechWithDistance>(
        r#"SELECT
             t.id,
             t.name,
             t.location_city,
             t.location_state,
             t.latitude,
             t.longitude,
             t.is_active,
             t.notes,
             t.created_at,
             t.updated_at,
             CASE
               WHEN t.latitude IS NOT NULL AND t.longitude IS NOT NULL
                    AND $2::float8 IS NOT NULL AND $3::float8 IS NOT NULL
               THEN 3958.8 * acos(
                 LEAST(1.0,
                   cos(radians($2)) * cos(radians(t.latitude)) * cos(radians(t.longitude) - radians($3))
                   + sin(radians($2)) * sin(radians(t.latitude))
                 )
               )
               ELSE NULL
             END AS distance_miles,
             false AS has_pto
           FROM public.technicians t
           WHERE t.is_active = true
           ORDER BY
             CASE WHEN t.latitude IS NOT NULL AND t.longitude IS NOT NULL
                       AND $2::float8 IS NOT NULL AND $3::float8 IS NOT NULL
                  THEN 0 ELSE 1 END ASC,
             CASE
               WHEN t.latitude IS NOT NULL AND t.longitude IS NOT NULL
                    AND $2::float8 IS NOT NULL AND $3::float8 IS NOT NULL
               THEN 3958.8 * acos(
                 LEAST(1.0,
                   cos(radians($2)) * cos(radians(t.latitude)) * cos(radians(t.longitude) - radians($3))
                   + sin(radians($2)) * sin(radians(t.latitude))
                 )
               )
               ELSE NULL
             END ASC NULLS LAST,
             t.name ASC"#,
    )
    .bind(site_id)
    .bind(site_lat)
    .bind(site_lng)
    .fetch_all(&pool)
    .await?;

    Ok(Json(techs))
}
