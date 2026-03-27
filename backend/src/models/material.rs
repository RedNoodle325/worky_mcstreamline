use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc, NaiveDate};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct MaterialHistory {
    pub id: Uuid,
    pub unit_id: Uuid,
    pub part_number: Option<String>,
    pub description: String,
    pub quantity: i32,
    pub date: Option<NaiveDate>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateMaterial {
    pub part_number: Option<String>,
    pub description: String,
    pub quantity: Option<i32>,
    pub date: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMaterial {
    pub part_number: Option<String>,
    pub description: Option<String>,
    pub quantity: Option<i32>,
    pub date: Option<String>,
    pub notes: Option<String>,
}
