use axum::{
    extract::{Multipart, Path, Query, State},
    Json,
};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;
use std::io::Write;

use crate::{
    error::{AppError, Result},
    models::bom::{BomImport, BomItem, ParsedBomLine, PartCatalog},
};

#[derive(Deserialize)]
#[allow(dead_code)]
pub struct BomQuery {
    pub site_id: Option<Uuid>,
    pub unit_id: Option<Uuid>,
}

pub async fn list_bom_imports(
    State(pool): State<PgPool>,
    Query(_q): Query<BomQuery>,
) -> Result<Json<Vec<BomImport>>> {
    let imports = sqlx::query_as::<_, BomImport>(
        "SELECT id, site_id, unit_id, assembly_number, bom_description, source_filename, imported_at
         FROM public.bom_imports ORDER BY imported_at DESC"
    )
    .fetch_all(&pool)
    .await?;
    Ok(Json(imports))
}

pub async fn get_bom_items(
    State(pool): State<PgPool>,
    Path(import_id): Path<Uuid>,
) -> Result<Json<Vec<BomItem>>> {
    let items = sqlx::query_as::<_, BomItem>(
        "SELECT * FROM public.bom_items WHERE bom_import_id = $1 ORDER BY sort_order"
    )
    .bind(import_id)
    .fetch_all(&pool)
    .await?;
    Ok(Json(items))
}

pub async fn search_parts(
    State(pool): State<PgPool>,
    Query(q): Query<std::collections::HashMap<String, String>>,
) -> Result<Json<Vec<PartCatalog>>> {
    let search = q.get("q").map(|s| format!("%{}%", s)).unwrap_or_else(|| "%".to_string());
    let parts = sqlx::query_as::<_, PartCatalog>(
        "SELECT * FROM public.parts_catalog
         WHERE part_number ILIKE $1 OR description ILIKE $1
         ORDER BY part_number LIMIT 100"
    )
    .bind(&search)
    .fetch_all(&pool)
    .await?;
    Ok(Json(parts))
}

pub async fn import_bom(
    State(pool): State<PgPool>,
    mut multipart: Multipart,
) -> Result<Json<BomImport>> {
    let mut pdf_bytes: Option<Vec<u8>> = None;
    let mut filename = String::from("bom.pdf");
    let mut site_id: Option<Uuid> = None;
    let mut unit_id: Option<Uuid> = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        AppError::BadRequest(format!("Multipart error: {}", e))
    })? {
        let field_name = field.name().unwrap_or("").to_string();
        match field_name.as_str() {
            "file" => {
                filename = field.file_name().unwrap_or("bom.pdf").to_string();
                pdf_bytes = Some(field.bytes().await.map_err(|e| {
                    AppError::BadRequest(format!("Failed to read file: {}", e))
                })?.to_vec());
            }
            "site_id" => {
                let val = field.text().await.unwrap_or_default();
                site_id = Uuid::parse_str(&val).ok();
            }
            "unit_id" => {
                let val = field.text().await.unwrap_or_default();
                unit_id = Uuid::parse_str(&val).ok();
            }
            _ => {}
        }
    }

    let bytes = pdf_bytes.ok_or_else(|| AppError::BadRequest("No file uploaded".to_string()))?;

    // Write to temp file and extract text
    let mut tmp = tempfile::NamedTempFile::new()
        .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;
    tmp.write_all(&bytes)
        .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;

    let raw_text = pdf_extract::extract_text(tmp.path())
        .map_err(|e| AppError::BadRequest(format!("PDF extraction failed: {}", e)))?;

    // Parse BOM from extracted text
    let (assembly_number, bom_desc, items) = parse_glovia_bom(&raw_text);

    // Insert BOM import record
    let bom_import = sqlx::query_as::<_, BomImport>(
        r#"INSERT INTO public.bom_imports
           (site_id, unit_id, assembly_number, bom_description, source_filename, raw_text)
           VALUES ($1,$2,$3,$4,$5,$6)
           RETURNING id, site_id, unit_id, assembly_number, bom_description, source_filename, imported_at"#,
    )
    .bind(site_id)
    .bind(unit_id)
    .bind(&assembly_number)
    .bind(&bom_desc)
    .bind(&filename)
    .bind(&raw_text)
    .fetch_one(&pool)
    .await?;

    // Upsert parts into catalog and link to BOM
    for (i, item) in items.iter().enumerate() {
        // Upsert into parts_catalog
        let part = sqlx::query_as::<_, PartCatalog>(
            r#"INSERT INTO public.parts_catalog (part_number, description, unit_of_measure)
               VALUES ($1, $2, $3)
               ON CONFLICT (part_number) DO UPDATE
               SET description = EXCLUDED.description,
                   unit_of_measure = EXCLUDED.unit_of_measure
               RETURNING *"#,
        )
        .bind(&item.component)
        .bind(&item.description)
        .bind(&item.unit_of_measure)
        .fetch_one(&pool)
        .await?;

        // Insert BOM line item
        sqlx::query(
            r#"INSERT INTO public.bom_items
               (bom_import_id, part_catalog_id, quantity, unit_of_measure, component, rev, description, sort_order)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8)"#,
        )
        .bind(bom_import.id)
        .bind(part.id)
        .bind(item.quantity)
        .bind(&item.unit_of_measure)
        .bind(&item.component)
        .bind(&item.rev)
        .bind(&item.description)
        .bind(i as i32)
        .execute(&pool)
        .await?;
    }

    tracing::info!("BOM imported: {} items from {}", items.len(), filename);
    Ok(Json(bom_import))
}

/// Parse the Glovia Multilevel BOM text output.
/// Returns (assembly_number, bom_description, items).
fn parse_glovia_bom(text: &str) -> (Option<String>, Option<String>, Vec<ParsedBomLine>) {
    let mut assembly_number: Option<String> = None;
    let mut bom_desc: Option<String> = None;
    let mut items: Vec<ParsedBomLine> = Vec::new();
    let mut header_found = false;
    let mut desc_col: Option<usize> = None;

    for line in text.lines() {
        let trimmed = line.trim();

        // Extract Assembly number from "Assembly: XXXXXXXX-XXXX" line
        if trimmed.starts_with("Assembly:") {
            let parts: Vec<&str> = trimmed.splitn(2, ':').collect();
            if parts.len() == 2 {
                assembly_number = Some(parts[1].split_whitespace().next().unwrap_or("").to_string());
            }
        }

        // Extract BOM description
        if trimmed.starts_with("BOM Desc:") {
            let parts: Vec<&str> = trimmed.splitn(2, ':').collect();
            if parts.len() == 2 {
                bom_desc = Some(parts[1].trim().to_string());
            }
        }

        // Find the header line to determine column positions
        if !header_found && trimmed.contains("Component") && trimmed.contains("Description") {
            header_found = true;
            // Find where "Description" starts in the line
            if let Some(pos) = line.find("Description") {
                desc_col = Some(pos);
            }
            continue;
        }

        // Skip separator lines
        if trimmed.starts_with("---") || trimmed.is_empty() {
            continue;
        }

        // Parse data lines (must start with a number for quantity)
        if header_found {
            if let Some(parsed) = parse_bom_line(line, desc_col) {
                items.push(parsed);
            }
        }
    }

    (assembly_number, bom_desc, items)
}

fn parse_bom_line(line: &str, desc_col: Option<usize>) -> Option<ParsedBomLine> {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return None;
    }

    let tokens: Vec<&str> = trimmed.split_whitespace().collect();
    if tokens.len() < 3 {
        return None;
    }

    // First token must be a number (quantity)
    let quantity = tokens[0].parse::<f64>().ok()?;
    let unit_of_measure = tokens[1].to_string();
    let component = tokens[2].to_string();

    // Component must look like a part number (contains digits and dashes)
    if !component.contains('-') && !component.chars().any(|c| c.is_alphanumeric()) {
        return None;
    }

    // Rev is optional (single letter or empty), then flags, then description
    // Description starts at a fixed column position or after the flags
    let description = if let Some(dc) = desc_col {
        if line.len() > dc {
            line[dc..].trim().to_string()
        } else {
            // Fallback: take everything after component
            tokens[3..].join(" ")
        }
    } else {
        // No column info, take the last substantial token group as description
        // Skip tokens that are just Y/N flags or dates
        let mut desc_start = 3;
        for (i, t) in tokens[3..].iter().enumerate() {
            if t.len() > 3 && t.contains(',') {
                desc_start = i + 3;
                break;
            }
        }
        tokens[desc_start..].join(" ")
    };

    if description.is_empty() {
        return None;
    }

    // Rev: if token[3] is a single alpha character, it's the revision
    let rev = if tokens.len() > 3 && tokens[3].len() == 1 && tokens[3].chars().all(|c| c.is_alphabetic()) {
        tokens[3].to_string()
    } else {
        String::new()
    };

    Some(ParsedBomLine {
        quantity,
        unit_of_measure,
        component,
        rev,
        description,
        sort_order: 0,
    })
}
