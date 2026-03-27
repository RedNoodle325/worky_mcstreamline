use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::NaiveDateTime;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct SiteDocument {
    pub id: Uuid,
    pub site_id: Uuid,
    pub doc_type: String,
    pub name: String,
    pub original_filename: Option<String>,
    pub url: String,
    pub file_size: Option<i64>,
    pub description: Option<String>,
    pub uploaded_at: Option<NaiveDateTime>,
}
