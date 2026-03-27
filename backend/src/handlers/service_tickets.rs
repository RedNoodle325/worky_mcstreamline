use axum::{
    extract::{Multipart, Path, State},
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    models::service_ticket::{CreateServiceTicket, ServiceTicket, UpdateServiceTicket},
};

const SELECT_COLS: &str = r#"id, site_id, title, description, status, c2_number,
                  parts_ordered, service_lines,
                  serial_number, ticket_type, open_date, priority_num, site_company_id,
                  scope_of_work, created_at, updated_at"#;

pub async fn list_all_tickets(
    State(pool): State<PgPool>,
) -> Result<Json<Vec<ServiceTicket>>> {
    let tickets = sqlx::query_as::<_, ServiceTicket>(
        &format!("SELECT {} FROM public.service_tickets ORDER BY created_at DESC", SELECT_COLS),
    )
    .fetch_all(&pool)
    .await?;
    Ok(Json(tickets))
}

pub async fn list_site_tickets(
    State(pool): State<PgPool>,
    Path(site_id): Path<Uuid>,
) -> Result<Json<Vec<ServiceTicket>>> {
    let tickets = sqlx::query_as::<_, ServiceTicket>(
        &format!("SELECT {} FROM public.service_tickets WHERE site_id = $1 ORDER BY created_at DESC", SELECT_COLS),
    )
    .bind(site_id)
    .fetch_all(&pool)
    .await?;
    Ok(Json(tickets))
}

pub async fn get_ticket(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<ServiceTicket>> {
    let ticket = sqlx::query_as::<_, ServiceTicket>(
        &format!("SELECT {} FROM public.service_tickets WHERE id = $1", SELECT_COLS),
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Service ticket {} not found", id)))?;
    Ok(Json(ticket))
}

pub async fn create_ticket(
    State(pool): State<PgPool>,
    Json(body): Json<CreateServiceTicket>,
) -> Result<Json<ServiceTicket>> {
    let empty: JsonValue = serde_json::json!([]);
    let ticket = sqlx::query_as::<_, ServiceTicket>(
        &format!(r#"INSERT INTO public.service_tickets
           (site_id, title, description, status, c2_number, parts_ordered, service_lines, scope_of_work)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING {}"#, SELECT_COLS),
    )
    .bind(body.site_id)
    .bind(&body.title)
    .bind(&body.description)
    .bind(body.status.as_deref().unwrap_or("open"))
    .bind(&body.c2_number)
    .bind(body.parts_ordered.as_ref().unwrap_or(&empty))
    .bind(body.service_lines.as_ref().unwrap_or(&empty))
    .bind(&body.scope_of_work)
    .fetch_one(&pool)
    .await?;
    Ok(Json(ticket))
}

pub async fn update_ticket(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateServiceTicket>,
) -> Result<Json<ServiceTicket>> {
    let ticket = sqlx::query_as::<_, ServiceTicket>(
        &format!(r#"UPDATE public.service_tickets SET
           title         = COALESCE($2, title),
           description   = COALESCE($3, description),
           status        = COALESCE($4, status),
           c2_number     = COALESCE($5, c2_number),
           parts_ordered = COALESCE($6, parts_ordered),
           service_lines = COALESCE($7, service_lines),
           scope_of_work = COALESCE($8, scope_of_work),
           updated_at    = now()
           WHERE id = $1
           RETURNING {}"#, SELECT_COLS),
    )
    .bind(id)
    .bind(&body.title)
    .bind(&body.description)
    .bind(&body.status)
    .bind(&body.c2_number)
    .bind(&body.parts_ordered)
    .bind(&body.service_lines)
    .bind(&body.scope_of_work)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Service ticket {} not found", id)))?;
    Ok(Json(ticket))
}

pub async fn delete_ticket(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    sqlx::query("DELETE FROM public.service_tickets WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await?;
    Ok(Json(serde_json::json!({ "deleted": id })))
}

// ── XML Import ────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, Default, Clone)]
struct AsteaRow {
    request_id: Option<String>,
    order_id: Option<String>,
    line_no: Option<i32>,
    descr: Option<String>,
    problem_desc: Option<String>,
    order_stat_descr: Option<String>,
    serial_no: Option<String>,
    callt_id: Option<String>,
    open_date: Option<String>,
    priority: Option<String>,
    site_company_descr: Option<String>,
    site_company_id: Option<String>,
    address_1: Option<String>,
    bpart_id: Option<String>,
    bpart_descr: Option<String>,
    tagno: Option<String>,
    sa_person_descr: Option<String>,
    actgr_descr: Option<String>,
    caller_name: Option<String>,
    company_descr: Option<String>,
    #[allow(dead_code)]
    owner_name: Option<String>,
    pcode_descr: Option<String>,
    is_in_history: Option<String>,
    order_type_id: Option<String>,
    cconth_id: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AsteaRoot {
    row: Vec<AsteaRow>,
}

#[derive(Debug, Serialize)]
pub struct ImportedTicket {
    pub request_id: String,
    pub title: String,
    pub status: String,
    pub site_name: Option<String>,
    pub site_id: Option<String>,
    pub serial_number: Option<String>,
    pub ticket_type: Option<String>,
    pub action: String, // "created" | "updated" | "skipped"
}

#[derive(Debug, Serialize)]
pub struct ImportResult {
    pub total: usize,
    pub created: usize,
    pub updated: usize,
    pub unmatched: usize,
    pub tickets: Vec<ImportedTicket>,
}

fn map_status(s: &str) -> &'static str {
    let lower = s.to_lowercase();
    if lower.contains("invoiced") || lower.contains("closed") || lower.contains("complete") || lower.contains("resolved") || lower.contains("released") {
        return "complete";
    }
    if lower.contains("assigned") || lower.contains("in progress") || lower.contains("dispatched")
        || lower.contains("order entry") || lower.contains("glovia")
    {
        return "in_progress";
    }
    if lower.contains("open") {
        return "open";
    }
    "in_progress"
}

pub async fn import_xml_tickets(
    State(pool): State<PgPool>,
    mut multipart: Multipart,
) -> Result<Json<ImportResult>> {
    // Read the uploaded XML bytes
    let mut xml_bytes = Vec::new();
    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::Internal(anyhow::anyhow!(e)))? {
        xml_bytes = field.bytes().await.map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?.to_vec();
        break;
    }
    if xml_bytes.is_empty() {
        return Err(AppError::BadRequest("No file uploaded".into()));
    }

    // Parse XML
    let root: AsteaRoot = quick_xml::de::from_reader(xml_bytes.as_slice())
        .map_err(|e| AppError::Internal(anyhow::anyhow!("XML parse error: {}", e)))?;

    // Load all sites for matching
    #[derive(sqlx::FromRow)]
    #[allow(dead_code)]
    struct SiteRow { id: Uuid, name: Option<String>, project_name: String, address: Option<String>, city: Option<String>, astea_site_id: Option<String> }
    let sites = sqlx::query_as::<_, SiteRow>(
        "SELECT id, name, project_name, address, city, astea_site_id FROM public.sites"
    )
    .fetch_all(&pool)
    .await?;

    fn match_site(row: &AsteaRow, sites: &[SiteRow]) -> Option<(Uuid, String)> {
        let site_co_id = row.site_company_id.as_deref().unwrap_or("").trim();

        // Try exact astea_site_id match first (most reliable)
        if !site_co_id.is_empty() {
            for s in sites {
                if let Some(ref astea_id) = s.astea_site_id {
                    if astea_id.eq_ignore_ascii_case(site_co_id) {
                        let display = s.name.clone().unwrap_or_else(|| s.project_name.clone());
                        return Some((s.id, display));
                    }
                }
            }
        }

        let addr1 = row.address_1.as_deref().unwrap_or("").to_lowercase();
        let co_descr = row.site_company_descr.as_deref().unwrap_or("").to_lowercase();

        // Try address match
        if !addr1.is_empty() {
            let addr_key: String = addr1.chars().filter(|c| c.is_alphanumeric()).take(10).collect();
            for s in sites {
                let site_addr = s.address.as_deref().unwrap_or("").to_lowercase();
                let site_key: String = site_addr.chars().filter(|c| c.is_alphanumeric()).take(10).collect();
                if !site_key.is_empty() && addr_key.starts_with(&site_key[..site_key.len().min(8)])
                    || (!site_key.is_empty() && site_key.starts_with(&addr_key[..addr_key.len().min(8)]))
                {
                    let display = s.name.clone().unwrap_or_else(|| s.project_name.clone());
                    return Some((s.id, display));
                }
            }
        }

        // Try name match
        if !co_descr.is_empty() {
            for s in sites {
                let site_name = s.name.as_deref().unwrap_or(&s.project_name).to_lowercase();
                if site_name.contains(&co_descr[..co_descr.len().min(12)])
                    || co_descr.contains(&site_name[..site_name.len().min(12)])
                {
                    let display = s.name.clone().unwrap_or_else(|| s.project_name.clone());
                    return Some((s.id, display));
                }
            }
        }
        None
    }

    // ── Group rows by request_id ──────────────────────────────────────────
    let mut grouped: std::collections::HashMap<String, Vec<&AsteaRow>> = std::collections::HashMap::new();
    for row in &root.row {
        if let Some(rid) = row.request_id.as_ref().filter(|r| !r.is_empty()) {
            grouped.entry(rid.clone()).or_default().push(row);
        }
    }

    let mut created = 0usize;
    let mut updated = 0usize;
    let mut unmatched = 0usize;
    let mut tickets: Vec<ImportedTicket> = Vec::new();
    let empty_json: JsonValue = serde_json::json!([]);

    for (request_id, rows) in &grouped {
        // Sort lines by line_no so line 1 is first
        let mut sorted_rows = rows.clone();
        sorted_rows.sort_by_key(|r| r.line_no.unwrap_or(999));

        // Use first row (line 1) for the ticket header
        let primary = sorted_rows[0];
        let title = primary.descr.clone().unwrap_or_else(|| request_id.clone());
        let description = primary.problem_desc.clone();
        let ticket_type = primary.callt_id.clone();
        let priority_num: Option<i32> = primary.priority.as_deref().and_then(|p| p.parse().ok());
        let site_co_id = primary.site_company_id.clone();

        // Parse open_date from the primary line
        let open_date: Option<chrono::DateTime<chrono::Utc>> = primary.open_date.as_deref().and_then(|d| {
            chrono::DateTime::parse_from_rfc3339(d).ok().map(|dt| dt.with_timezone(&chrono::Utc))
        });

        // Determine overall status from all lines
        // If any line is open/in-progress, the ticket is open; if all closed/invoiced, closed
        let statuses: Vec<&str> = sorted_rows.iter()
            .map(|r| map_status(r.order_stat_descr.as_deref().unwrap_or("open")))
            .collect();
        let status = if statuses.iter().any(|s| *s == "open") { "open" }
            else if statuses.iter().any(|s| *s == "in_progress") { "in_progress" }
            else { statuses.first().copied().unwrap_or("open") };

        // Build service_lines JSON array from all rows
        let service_lines_json: JsonValue = serde_json::json!(
            sorted_rows.iter().map(|r| {
                serde_json::json!({
                    "order_id":         r.order_id,
                    "line_no":          r.line_no,
                    "astea_id":         r.order_id,
                    "description":      r.bpart_descr,
                    "part_number":      r.bpart_id,
                    "serial_number":    r.serial_no,
                    "tag":              r.tagno,
                    "status":           r.order_stat_descr,
                    "technician":       r.sa_person_descr,
                    "activity_group":   r.actgr_descr,
                    "problem_desc":     r.problem_desc,
                    "open_date":        r.open_date,
                    "caller_name":      r.caller_name,
                    "company":          r.company_descr,
                    "product_code":     r.pcode_descr,
                    "is_history":       r.is_in_history,
                    "order_type":       r.order_type_id,
                    "contract":         r.cconth_id,
                })
            }).collect::<Vec<_>>()
        );

        // Site matching — try the primary row first
        let (site_id_opt, site_name) = match match_site(primary, &sites) {
            Some((id, name)) => (Some(id), Some(name)),
            None => {
                // Try other rows in case they have better site info
                let mut found = None;
                for r in &sorted_rows[1..] {
                    if let Some(m) = match_site(r, &sites) {
                        found = Some(m);
                        break;
                    }
                }
                match found {
                    Some((id, name)) => (Some(id), Some(name)),
                    None => {
                        unmatched += 1;
                        (None, primary.site_company_descr.clone().or_else(|| primary.company_descr.clone()))
                    }
                }
            }
        };

        let serial_number = primary.serial_no.clone();
        let line_count = sorted_rows.len();

        // Check if ticket with this c2_number already exists
        let existing: Option<(Uuid,)> = sqlx::query_as(
            "SELECT id FROM public.service_tickets WHERE c2_number = $1 LIMIT 1"
        )
        .bind(request_id)
        .fetch_optional(&pool)
        .await?;

        let action = if let Some((existing_id,)) = existing {
            sqlx::query(
                r#"UPDATE public.service_tickets SET
                   title = $2, description = $3, status = $4,
                   serial_number = $5, ticket_type = $6, open_date = $7,
                   priority_num = $8, site_company_id = $9,
                   site_id = COALESCE($10, site_id),
                   service_lines = $11,
                   updated_at = now()
                   WHERE id = $1"#
            )
            .bind(existing_id)
            .bind(&title)
            .bind(&description)
            .bind(status)
            .bind(&serial_number)
            .bind(&ticket_type)
            .bind(open_date)
            .bind(priority_num)
            .bind(&site_co_id)
            .bind(site_id_opt)
            .bind(&service_lines_json)
            .execute(&pool)
            .await?;
            updated += 1;
            "updated"
        } else {
            sqlx::query(
                r#"INSERT INTO public.service_tickets
                   (site_id, title, description, status, c2_number,
                    parts_ordered, service_lines,
                    serial_number, ticket_type, open_date, priority_num, site_company_id)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)"#
            )
            .bind(site_id_opt)
            .bind(&title)
            .bind(&description)
            .bind(status)
            .bind(request_id)
            .bind(&empty_json)
            .bind(&service_lines_json)
            .bind(&serial_number)
            .bind(&ticket_type)
            .bind(open_date)
            .bind(priority_num)
            .bind(&site_co_id)
            .execute(&pool)
            .await?;
            created += 1;
            "created"
        };

        tickets.push(ImportedTicket {
            request_id: format!("{} ({} lines)", request_id, line_count),
            title: title.chars().take(80).collect(),
            status: status.to_string(),
            site_name,
            site_id: site_id_opt.map(|id| id.to_string()),
            serial_number,
            ticket_type,
            action: action.to_string(),
        });
    }

    // Sort result by request_id for display
    tickets.sort_by(|a, b| b.request_id.cmp(&a.request_id));

    Ok(Json(ImportResult {
        total: tickets.len(),
        created,
        updated,
        unmatched,
        tickets,
    }))
}
