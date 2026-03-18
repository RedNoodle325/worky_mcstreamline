use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::NaiveDateTime;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct SiteJobNumber {
    pub id: Uuid,
    pub site_id: Uuid,
    pub job_number: String,
    pub description: Option<String>,
    pub is_primary: Option<bool>,
    pub created_at: Option<NaiveDateTime>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSiteJobNumber {
    pub job_number: String,
    pub description: Option<String>,
    pub is_primary: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSiteJobNumber {
    pub job_number: Option<String>,
    pub description: Option<String>,
    pub is_primary: Option<bool>,
}
