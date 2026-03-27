use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Note {
    pub id: Uuid,
    pub site_id: Option<Uuid>,
    pub unit_id: Option<Uuid>,
    pub note_type: String,
    pub content: String,
    pub author: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateNote {
    pub site_id: Option<Uuid>,
    pub unit_id: Option<Uuid>,
    pub note_type: Option<String>,
    pub content: String,
    pub author: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateNote {
    pub note_type: Option<String>,
    pub content: Option<String>,
    pub author: Option<String>,
}
