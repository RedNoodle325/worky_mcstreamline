use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::NaiveDateTime;


#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Issue {
    pub id: Uuid,
    pub site_id: Option<Uuid>,
    pub unit_id: Option<Uuid>,
    pub ticket_type: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub unit_tag: Option<String>,
    pub reported_by: Option<String>,
    pub resolution_notes: Option<String>,
    pub reported_date: Option<NaiveDateTime>,
    pub closed_date: Option<NaiveDateTime>,
    pub cxalloy_issue_id: Option<String>,
    pub cxalloy_url: Option<String>,
    pub cx_zone: Option<String>,
    pub cx_issue_type: Option<String>,
    pub cx_source: Option<String>,
    pub service_ticket_id: Option<Uuid>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

#[derive(Debug, Deserialize)]
pub struct CreateIssue {
    pub site_id: Uuid,
    pub unit_id: Option<Uuid>,
    pub title: String,
    pub description: Option<String>,
    pub unit_tag: Option<String>,
    pub priority: Option<String>,
    pub status: Option<String>,
    pub reported_by: Option<String>,
    pub resolution_notes: Option<String>,
    pub cx_zone: Option<String>,
    pub cx_issue_type: Option<String>,
    pub cx_source: Option<String>,
    pub cxalloy_url: Option<String>,
    pub service_ticket_id: Option<Uuid>,
    pub reported_date: Option<String>,
    pub closed_date: Option<String>,
    pub ticket_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateIssue {
    pub unit_id: Option<Uuid>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub unit_tag: Option<String>,
    pub resolution_notes: Option<String>,
    pub closed_date: Option<String>,
    pub cx_zone: Option<String>,
    pub cx_issue_type: Option<String>,
    pub cxalloy_url: Option<String>,
    pub service_ticket_id: Option<Uuid>,
}
