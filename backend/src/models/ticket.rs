use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::NaiveDateTime;

// ticket_type: cs_ticket | parts_order | service_line | commissioning_issue
// status: open | parts_ordered | tech_dispatched | on_site | resolved | closed | in_progress | ready_to_inspect | work_complete

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Ticket {
    pub id: Uuid,
    pub site_id: Option<Uuid>,
    pub unit_id: Option<Uuid>,
    pub astea_request_id: Option<String>,
    pub ticket_line_number: Option<i32>,
    pub ticket_type: Option<String>,
    pub reported_by_type: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub parts_ordered: Option<bool>,
    pub tech_dispatched: Option<bool>,
    pub resolution: Option<String>,
    pub reported_by: Option<String>,
    pub resolution_notes: Option<String>,
    pub reported_date: Option<NaiveDateTime>,
    pub closed_date: Option<NaiveDateTime>,
    // Parts order fields
    pub unit_tag: Option<String>,
    pub unit_serial_number: Option<String>,
    pub parts_items: Option<serde_json::Value>,
    // Service line fields
    pub scope: Option<String>,
    pub num_techs: Option<i32>,
    pub service_start_date: Option<chrono::NaiveDate>,
    pub service_end_date: Option<chrono::NaiveDate>,
    // CxAlloy commissioning fields
    pub cxalloy_issue_id: Option<String>,
    pub cx_zone: Option<String>,
    pub cx_issue_type: Option<String>,
    pub cx_source: Option<String>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
    pub resolved_at: Option<NaiveDateTime>,
}

#[derive(Debug, Deserialize)]
pub struct CxAlloyIssuePayload {
    pub cxalloy_issue_id: String,
    pub title: String,
    pub description: Option<String>,
    pub unit_tag: Option<String>,
    pub priority: Option<String>,
    pub status: Option<String>,
    pub reported_by: Option<String>,
    pub resolution_notes: Option<String>,
    pub closed_date: Option<String>,
    pub reported_date: Option<String>,
    pub cx_zone: Option<String>,
    pub cx_issue_type: Option<String>,
    pub cx_source: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CxAlloyImportBody {
    pub issues: Vec<CxAlloyIssuePayload>,
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
    pub unit_tag: Option<String>,
    pub unit_serial_number: Option<String>,
    pub parts_items: Option<serde_json::Value>,
    pub scope: Option<String>,
    pub num_techs: Option<i32>,
    pub service_start_date: Option<chrono::NaiveDate>,
    pub service_end_date: Option<chrono::NaiveDate>,
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
    pub unit_tag: Option<String>,
    pub unit_serial_number: Option<String>,
    pub parts_items: Option<serde_json::Value>,
    pub scope: Option<String>,
    pub num_techs: Option<i32>,
    pub service_start_date: Option<chrono::NaiveDate>,
    pub service_end_date: Option<chrono::NaiveDate>,
}
