use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

/// A SyCool system — one ACCU (condenser) paired with one CRAC (evaporator).
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct SyCoolSystem {
    pub id:            Uuid,
    pub site_id:       Uuid,
    pub data_hall:     String,
    pub system_number: String,
    pub created_at:    Option<DateTime<Utc>>,
    pub updated_at:    Option<DateTime<Utc>>,
}

/// System with its two child units pre-fetched as JSON.
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct SyCoolSystemWithUnits {
    pub id:            Uuid,
    pub site_id:       Uuid,
    pub data_hall:     String,
    pub system_number: String,
    pub created_at:    Option<DateTime<Utc>>,
    pub updated_at:    Option<DateTime<Utc>>,
    // JSON arrays built by the query
    pub accu:          sqlx::types::Json<Option<SystemUnit>>,
    pub crac:          sqlx::types::Json<Option<SystemUnit>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemUnit {
    pub id:               Uuid,
    pub asset_tag:        Option<String>,
    pub serial_number:    String,
    pub commission_level: Option<String>,
    pub status:           Option<String>,
    pub notes:            Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSyCoolSystem {
    pub data_hall:     String,
    pub system_number: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSyCoolSystem {
    pub data_hall:     Option<String>,
    pub system_number: Option<String>,
}
