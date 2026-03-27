use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::NaiveDateTime;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct IssueLineLink {
    pub id: Uuid,
    pub issue_id: Uuid,
    pub service_ticket_id: Uuid,
    pub order_id: String,
    pub created_at: Option<NaiveDateTime>,
}

#[derive(Debug, Deserialize)]
pub struct CreateIssueLineLink {
    pub issue_id: Uuid,
    pub order_id: String,
}

#[derive(Debug, Deserialize)]
pub struct BulkLinkRequest {
    pub issue_ids: Vec<Uuid>,
    pub order_id: String,
}
