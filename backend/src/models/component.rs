use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc, NaiveDate};

// ── Component ──────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct UnitComponent {
    pub id: Uuid,
    pub unit_id: Uuid,
    pub name: String,
    pub model: Option<String>,
    pub serial_number: Option<String>,
    pub installed_date: Option<NaiveDate>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateComponent {
    pub name: String,
    pub model: Option<String>,
    pub serial_number: Option<String>,
    pub installed_date: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateComponent {
    pub name: Option<String>,
    pub model: Option<String>,
    pub serial_number: Option<String>,
    pub installed_date: Option<String>,
    pub notes: Option<String>,
}

// ── Component Update ───────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ComponentUpdate {
    pub id: Uuid,
    pub component_id: Uuid,
    pub description: String,
    pub performed_by: Option<String>,
    pub date: Option<NaiveDate>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateComponentUpdate {
    pub description: String,
    pub performed_by: Option<String>,
    pub date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateComponentUpdate {
    pub description: Option<String>,
    pub performed_by: Option<String>,
    pub date: Option<String>,
}
