use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct MsowDraft {
    pub id: Uuid,
    pub site_id: Option<Uuid>,
    pub name: String,
    pub form_data: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateMsowDraft {
    pub site_id: Option<Uuid>,
    pub name: Option<String>,
    pub form_data: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMsowDraft {
    pub name: Option<String>,
    pub form_data: Option<serde_json::Value>,
}
