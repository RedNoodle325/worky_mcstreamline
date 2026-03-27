use axum::{
    extract::{Multipart, Path, Query, State},
    Json,
};
use chrono::NaiveDate;
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    models::unit::{BulkCommissionUpdate, CreateUnit, Unit, UpdateUnit},
};

#[derive(Deserialize)]
pub struct UnitFilter {
    pub site_id: Option<Uuid>,
    pub unit_type: Option<String>,
    pub commission_level: Option<String>,
}

pub async fn list_units(
    State(pool): State<PgPool>,
    Query(filter): Query<UnitFilter>,
) -> Result<Json<Vec<Unit>>> {
    let mut conditions: Vec<String> = Vec::new();
    if filter.site_id.is_some()         { conditions.push(format!("site_id = ${}", conditions.len() + 1)); }
    if filter.unit_type.is_some()       { conditions.push(format!("unit_type = ${}", conditions.len() + 1)); }
    if filter.commission_level.is_some(){ conditions.push(format!("commission_level = ${}", conditions.len() + 1)); }

    let where_clause = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };
    let sql = format!("SELECT * FROM public.units {} ORDER BY job_number, line_number", where_clause);

    let mut query = sqlx::query_as::<_, Unit>(&sql);
    if let Some(v) = filter.site_id         { query = query.bind(v); }
    if let Some(v) = filter.unit_type       { query = query.bind(v); }
    if let Some(v) = filter.commission_level{ query = query.bind(v); }

    let units = query.fetch_all(&pool).await?;
    Ok(Json(units))
}

pub async fn get_unit(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<Unit>> {
    let unit = sqlx::query_as::<_, Unit>(
        "SELECT * FROM public.units WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Unit {} not found", id)))?;
    Ok(Json(unit))
}

pub async fn create_unit(
    State(pool): State<PgPool>,
    Json(body): Json<CreateUnit>,
) -> Result<Json<Unit>> {
    let unit = sqlx::query_as::<_, Unit>(
        r#"INSERT INTO public.units
           (site_id, unit_type, serial_number, job_number, line_number,
            manufacturer, model, description, location_in_site,
            install_date, warranty_start_date, warranty_end_date, notes,
            commission_level, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'none','active')
           RETURNING *"#,
    )
    .bind(body.site_id)
    .bind(&body.unit_type)
    .bind(&body.serial_number)
    .bind(&body.job_number)
    .bind(body.line_number)
    .bind(&body.manufacturer)
    .bind(&body.model)
    .bind(&body.description)
    .bind(&body.location_in_site)
    .bind(body.install_date)
    .bind(body.warranty_start_date)
    .bind(body.warranty_end_date)
    .bind(&body.notes)
    .fetch_one(&pool)
    .await?;
    Ok(Json(unit))
}

pub async fn update_unit(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateUnit>,
) -> Result<Json<Unit>> {
    let unit = sqlx::query_as::<_, Unit>(
        r#"UPDATE public.units SET
           unit_type = COALESCE($2, unit_type),
           serial_number = COALESCE($3, serial_number),
           job_number = COALESCE($4, job_number),
           line_number = COALESCE($5, line_number),
           manufacturer = COALESCE($6, manufacturer),
           model = COALESCE($7, model),
           description = COALESCE($8, description),
           location_in_site = COALESCE($9, location_in_site),
           status = COALESCE($10, status),
           install_date = COALESCE($11, install_date),
           warranty_start_date = COALESCE($12, warranty_start_date),
           warranty_end_date = COALESCE($13, warranty_end_date),
           commission_level = COALESCE($14, commission_level),
           operational_status = COALESCE($15, operational_status),
           notes = COALESCE($16, notes),
           rfe_job_number = COALESCE($17, rfe_job_number),
           rfe_wo_number = COALESCE($18, rfe_wo_number),
           rfe_date = COALESCE($19, rfe_date),
           rfe_description = COALESCE($20, rfe_description),
           updated_at = now()
           WHERE id = $1
           RETURNING *"#,
    )
    .bind(id)
    .bind(&body.unit_type)
    .bind(&body.serial_number)
    .bind(&body.job_number)
    .bind(body.line_number)
    .bind(&body.manufacturer)
    .bind(&body.model)
    .bind(&body.description)
    .bind(&body.location_in_site)
    .bind(&body.status)
    .bind(body.install_date)
    .bind(body.warranty_start_date)
    .bind(body.warranty_end_date)
    .bind(&body.commission_level)
    .bind(&body.operational_status)
    .bind(&body.notes)
    .bind(&body.rfe_job_number)
    .bind(&body.rfe_wo_number)
    .bind(body.rfe_date)
    .bind(&body.rfe_description)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Unit {} not found", id)))?;
    Ok(Json(unit))
}

pub async fn set_operational_status(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(body): Json<serde_json::Value>,
) -> Result<Json<Unit>> {
    let status = body["operational_status"].as_str().unwrap_or("operational");
    let unit = sqlx::query_as::<_, Unit>(
        "UPDATE public.units SET operational_status = $2, updated_at = now() WHERE id = $1 RETURNING *"
    )
    .bind(id)
    .bind(status)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Unit {} not found", id)))?;
    Ok(Json(unit))
}

pub async fn delete_unit(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    sqlx::query("DELETE FROM public.units WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await?;
    Ok(Json(serde_json::json!({ "deleted": id })))
}

// ---------------------------------------------------------------------------
// Astea CSV import
// POST /sites/:site_id/units/import
// Accepts multipart with a "file" field containing the Astea unit list CSV.
//
// Column mapping:
//   bpart_id suffix (COND/EVAP/…) → unit_type
//   serial_no                      → serial_number  (suffixed with component type)
//   base of bpart_id               → job_number
//   numeric suffix of serial_no    → line_number
//   descr                          → description
//   install_date                   → install_date
//   def_node_id                    → manufacturer  (MUNTERS_US → "Munters")
//   pclass2_descr                  → location_in_site
//   status                         → status        (Installed → active)
// ---------------------------------------------------------------------------
pub async fn import_units_csv(
    State(pool): State<PgPool>,
    Path(site_id): Path<Uuid>,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>> {
    // Read CSV bytes from the "file" multipart field
    let mut csv_bytes: Vec<u8> = Vec::new();
    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?
    {
        if field.name().unwrap_or("") == "file" {
            csv_bytes = field
                .bytes()
                .await
                .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?
                .to_vec();
            break;
        }
    }
    if csv_bytes.is_empty() {
        return Err(AppError::BadRequest("No 'file' field in upload".into()));
    }

    let mut rdr = csv::ReaderBuilder::new()
        .has_headers(true)
        .trim(csv::Trim::All)
        .from_reader(csv_bytes.as_slice());

    // Build a header-name → index map for flexible column lookup
    let headers = rdr
        .headers()
        .map_err(|e| AppError::BadRequest(format!("CSV header parse error: {e}")))?
        .clone();
    let col_index: std::collections::HashMap<&str, usize> = headers
        .iter()
        .enumerate()
        .map(|(i, h)| (h, i))
        .collect();

    let get = |rec: &csv::StringRecord, name: &str| -> String {
        col_index
            .get(name)
            .and_then(|&i| rec.get(i))
            .unwrap_or("")
            .trim()
            .to_string()
    };

    let mut imported: u32 = 0;
    let mut skipped: u32 = 0;
    let mut tx = pool.begin().await?;

    for result in rdr.records() {
        let rec = result
            .map_err(|e| AppError::BadRequest(format!("CSV parse error: {e}")))?;

        let bpart_id = get(&rec, "bpart_id");
        let serial_no = get(&rec, "serial_no");

        // Skip rows with no bpart_id or serial_no
        if bpart_id.is_empty() || serial_no.is_empty() {
            skipped += 1;
            continue;
        }

        // --- unit_type: extract suffix after last '-' from bpart_id ---
        let component_suffix = bpart_id
            .rsplit('-')
            .next()
            .unwrap_or("UNKNOWN")
            .to_uppercase();
        let unit_type = match component_suffix.as_str() {
            "COND" => "condenser".to_string(),
            "EVAP" => "evaporator".to_string(),
            other  => other.to_lowercase(),
        };

        // --- job_number: everything before the last '-' in bpart_id ---
        let job_number = bpart_id
            .rsplitn(2, '-')
            .nth(1)
            .map(|s| s.to_string());

        // --- serial_number: serial_no + "-" + component suffix (unique per component) ---
        let serial_number = format!("{}-{}", serial_no, component_suffix);

        // --- line_number: numeric suffix of serial_no ---
        let line_number: Option<i32> = serial_no
            .rsplit('-')
            .next()
            .and_then(|s| s.trim_start_matches('0').parse::<i32>().ok());

        // --- description ---
        let description = {
            let d = get(&rec, "descr");
            if d.is_empty() { None } else { Some(d) }
        };

        // --- install_date: "2024-01-17 12:00:00 AM" → NaiveDate ---
        let install_date: Option<NaiveDate> = {
            let raw = get(&rec, "install_date");
            if raw.is_empty() {
                None
            } else {
                // Try full datetime format first, then just date
                chrono::NaiveDateTime::parse_from_str(&raw, "%Y-%m-%d %I:%M:%S %p")
                    .map(|dt| dt.date())
                    .or_else(|_| NaiveDate::parse_from_str(&raw, "%Y-%m-%d"))
                    .ok()
            }
        };

        // --- manufacturer: map MUNTERS_US → "Munters" ---
        let manufacturer: Option<String> = {
            let raw = get(&rec, "def_node_id");
            if raw.is_empty() {
                None
            } else {
                Some(match raw.as_str() {
                    "MUNTERS_US" => "Munters".to_string(),
                    other => other.to_string(),
                })
            }
        };

        // --- location_in_site ---
        let location_in_site: Option<String> = {
            let d = get(&rec, "pclass2_descr");
            if d.is_empty() { None } else { Some(d) }
        };

        // --- status: Installed → active ---
        let status: String = match get(&rec, "status").to_lowercase().as_str() {
            "installed" => "active".to_string(),
            other if other.is_empty() => "active".to_string(),
            other => other.to_string(),
        };

        sqlx::query(
            r#"INSERT INTO public.units
               (site_id, unit_type, serial_number, job_number, line_number,
                manufacturer, description, location_in_site,
                install_date, status, commission_level)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'none')"#,
        )
        .bind(site_id)
        .bind(&unit_type)
        .bind(&serial_number)
        .bind(&job_number)
        .bind(line_number)
        .bind(&manufacturer)
        .bind(&description)
        .bind(&location_in_site)
        .bind(install_date)
        .bind(&status)
        .execute(&mut *tx)
        .await?;

        imported += 1;
    }

    tx.commit().await?;

    Ok(Json(serde_json::json!({
        "imported": imported,
        "skipped": skipped,
        "site_id": site_id,
    })))
}

pub async fn bulk_update_commission(
    State(pool): State<PgPool>,
    Path(site_id): Path<Uuid>,
    Json(body): Json<BulkCommissionUpdate>,
) -> Result<Json<serde_json::Value>> {
    let mut updated: i64 = 0;
    for u in &body.updates {
        let rows = sqlx::query(
            "UPDATE public.units SET commission_level = $1, updated_at = now() WHERE id = $2 AND site_id = $3"
        )
        .bind(&u.commission_level)
        .bind(u.unit_id)
        .bind(site_id)
        .execute(&pool)
        .await?
        .rows_affected();
        updated += rows as i64;
    }
    Ok(Json(serde_json::json!({ "updated": updated })))
}
