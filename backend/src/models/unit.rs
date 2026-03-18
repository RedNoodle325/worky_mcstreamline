use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{NaiveDateTime, NaiveDate};

// Valid values: chiller, air_handler, indirect_cooling, indirect_evaporative, sycool
// Commission levels: none, L1, L2, L3, L4, L5, complete

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Unit {
    pub id: Uuid,
    pub site_id: Option<Uuid>,
    pub job_number: Option<String>,
    pub line_number: Option<i32>,
    pub serial_number: Option<String>, // legacy field; computed as job_number-line_number
    pub unit_type: Option<String>,
    pub model: Option<String>,
    pub description: Option<String>,
    pub commission_level: Option<String>,
    pub warranty_start_date: Option<NaiveDate>,
    pub warranty_end_date: Option<NaiveDate>,
    pub notes: Option<String>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UnitWithSerial {
    #[serde(flatten)]
    pub unit: Unit,
    pub serial: String, // job_number-line_number
}

#[derive(Debug, Deserialize)]
pub struct CreateUnit {
    pub site_id: Uuid,
    pub job_number: String,
    pub line_number: i32,
    pub unit_type: String, // chiller | air_handler | indirect_cooling | indirect_evaporative | sycool
    pub model: Option<String>,
    pub description: Option<String>,
    pub warranty_start_date: Option<NaiveDate>,
    pub warranty_end_date: Option<NaiveDate>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUnit {
    pub unit_type: Option<String>,
    pub model: Option<String>,
    pub description: Option<String>,
    pub commission_level: Option<String>,
    pub warranty_start_date: Option<NaiveDate>,
    pub warranty_end_date: Option<NaiveDate>,
    pub notes: Option<String>,
}
