use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::NaiveDateTime;

// ticket_type: complaint | service_order | warranty | pm
// status: open | parts_ordered | tech_dispatched | on_site | resolved | closed
// reported_by_type: technician | site_representative | internal

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Ticket {
    pub id: Uuid,
    pub site_id: Option<Uuid>,
    pub unit_id: Option<Uuid>,
    pub astea_request_id: Option<String>, // e.g. CS2603170028@@1
    pub ticket_line_number: Option<i32>,
    pub ticket_type: Option<String>,
    pub reported_by_type: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub parts_ordered: Option<bool>,
    pub tech_dispatched: Option<bool>,
    pub resolution: Option<String>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
    pub resolved_at: Option<NaiveDateTime>,
}

#[derive(Debug, Deserialize)]
pub struct CreateTicket {
    pub site_id: Uuid,
    pub unit_id: Option<Uuid>,
    pub astea_request_id: Option<String>,
    pub ticket_line_number: Option<i32>,
    pub ticket_type: Option<String>,
    pub reported_by_type: Option<String>,
    pub title: String,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTicket {
    pub astea_request_id: Option<String>,
    pub status: Option<String>,
    pub parts_ordered: Option<bool>,
    pub tech_dispatched: Option<bool>,
    pub resolution: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
}
