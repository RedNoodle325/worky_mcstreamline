use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::NaiveDateTime;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct SiteFormTemplate {
    pub id: Uuid,
    pub site_id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub url: Option<String>,
    pub filename: Option<String>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSiteForm {
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub url: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSiteForm {
    pub name: Option<String>,
    pub description: Option<String>,
    pub category: Option<String>,
    pub url: Option<String>,
}
