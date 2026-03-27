use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct ServiceTicket {
    pub id: Uuid,
    pub site_id: Option<Uuid>,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub c2_number: Option<String>,
    pub parts_ordered: JsonValue,
    pub service_lines: JsonValue,
    pub serial_number: Option<String>,
    pub ticket_type: Option<String>,
    pub open_date: Option<DateTime<Utc>>,
    pub priority_num: Option<i32>,
    pub site_company_id: Option<String>,
    pub scope_of_work: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateServiceTicket {
    pub site_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub status: Option<String>,
    pub c2_number: Option<String>,
    pub parts_ordered: Option<JsonValue>,
    pub service_lines: Option<JsonValue>,
    pub scope_of_work: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateServiceTicket {
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub c2_number: Option<String>,
    pub parts_ordered: Option<JsonValue>,
    pub service_lines: Option<JsonValue>,
    pub scope_of_work: Option<String>,
}
