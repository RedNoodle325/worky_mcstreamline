use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{NaiveDateTime, NaiveDate};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct CommissioningProject {
    pub id: Uuid,
    pub site_id: Option<Uuid>,
    pub unit_id: Option<Uuid>,
    pub l1_completed: Option<bool>,
    pub l1_date: Option<NaiveDate>,
    pub l1_completed_by: Option<String>,
    pub l1_checklist_url: Option<String>,
    pub l1_checklist_filename: Option<String>,
    pub l2_completed: Option<bool>,
    pub l2_date: Option<NaiveDate>,
    pub l2_completed_by: Option<String>,
    pub l2_checklist_url: Option<String>,
    pub l2_checklist_filename: Option<String>,
    pub l3_completed: Option<bool>,
    pub l3_date: Option<NaiveDate>,
    pub l3_completed_by: Option<String>,
    pub l3_checklist_url: Option<String>,
    pub l3_checklist_filename: Option<String>,
    pub l4_completed: Option<bool>,
    pub l4_date: Option<NaiveDate>,
    pub l4_completed_by: Option<String>,
    pub l4_checklist_url: Option<String>,
    pub l4_checklist_filename: Option<String>,
    pub l5_completed: Option<bool>,
    pub l5_date: Option<NaiveDate>,
    pub l5_completed_by: Option<String>,
    pub l5_checklist_url: Option<String>,
    pub l5_checklist_filename: Option<String>,
    pub notes: Option<String>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCommissioningLevel {
    pub level: u8,           // 1–5
    pub completed: bool,
    pub date: Option<NaiveDate>,
    pub completed_by: Option<String>,
    pub checklist_filename: Option<String>,
    pub checklist_url: Option<String>,
}
