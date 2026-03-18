use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{NaiveDateTime, NaiveDate};

// status: submitted | in_review | approved | denied | closed

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct WarrantyClaim {
    pub id: Uuid,
    pub unit_id: Option<Uuid>,
    pub site_id: Option<Uuid>,
    pub issue_id: Option<Uuid>,
    pub astea_request_id: Option<String>,
    pub claim_date: Option<NaiveDate>,
    pub description: String,
    pub status: Option<String>,
    pub resolution: Option<String>,
    pub closed_date: Option<NaiveDate>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

#[derive(Debug, Deserialize)]
pub struct CreateWarrantyClaim {
    pub unit_id: Uuid,
    pub site_id: Uuid,
    pub issue_id: Option<Uuid>,
    pub astea_request_id: Option<String>,
    pub description: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateWarrantyClaim {
    pub status: Option<String>,
    pub resolution: Option<String>,
    pub closed_date: Option<NaiveDate>,
    pub astea_request_id: Option<String>,
}
