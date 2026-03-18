use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::NaiveDateTime;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct BomImport {
    pub id: Uuid,
    pub site_id: Option<Uuid>,
    pub unit_id: Option<Uuid>,
    pub assembly_number: Option<String>,
    pub bom_description: Option<String>,
    pub source_filename: Option<String>,
    pub imported_at: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow, Clone)]
pub struct BomItem {
    pub id: Uuid,
    pub bom_import_id: Option<Uuid>,
    pub part_catalog_id: Option<Uuid>,
    pub quantity: Option<f64>,
    pub unit_of_measure: Option<String>,
    pub component: String,
    pub rev: Option<String>,
    pub description: Option<String>,
    pub sort_order: Option<i32>,
}

// Parsed from the Glovia BOM PDF text
#[derive(Debug, Clone)]
pub struct ParsedBomLine {
    pub quantity: f64,
    pub unit_of_measure: String,
    pub component: String,
    pub rev: String,
    pub description: String,
    pub sort_order: i32,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct PartCatalog {
    pub id: Uuid,
    pub part_number: String,
    pub description: Option<String>,
    pub unit_of_measure: Option<String>,
    pub has_serial_number: Option<bool>,
    pub notes: Option<String>,
    pub created_at: Option<NaiveDateTime>,
}
