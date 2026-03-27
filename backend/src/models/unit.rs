use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{NaiveDateTime, NaiveDate};


#[derive(Debug, Deserialize)]
pub struct CommissionUpdate {
    pub unit_id: Uuid,
    pub commission_level: String,
}

#[derive(Debug, Deserialize)]
pub struct BulkCommissionUpdate {
    pub updates: Vec<CommissionUpdate>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Unit {
    pub id: Uuid,
    pub site_id: Option<Uuid>,
    pub system_id: Option<Uuid>,
    pub unit_type: String,           // NOT NULL in DB
    pub asset_tag: Option<String>,
    pub serial_number: String,       // NOT NULL in DB
    pub job_number: Option<String>,
    pub line_number: Option<i32>,
    pub manufacturer: Option<String>,
    pub model: Option<String>,
    pub description: Option<String>,
    pub location_in_site: Option<String>,
    pub status: Option<String>,
    pub install_date: Option<NaiveDate>,
    pub warranty_start_date: Option<NaiveDate>,
    pub warranty_end_date: Option<NaiveDate>,
    pub commission_level: Option<String>,
    pub operational_status: String,
    pub notes: Option<String>,
    pub rfe_job_number: Option<String>,
    pub rfe_wo_number: Option<String>,
    pub rfe_date: Option<NaiveDate>,
    pub rfe_description: Option<String>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

#[derive(Debug, Deserialize)]
pub struct CreateUnit {
    pub site_id: Uuid,
    pub unit_type: String,
    pub serial_number: String,
    pub job_number: Option<String>,
    pub line_number: Option<i32>,
    pub manufacturer: Option<String>,
    pub model: Option<String>,
    pub description: Option<String>,
    pub location_in_site: Option<String>,
    pub install_date: Option<NaiveDate>,
    pub warranty_start_date: Option<NaiveDate>,
    pub warranty_end_date: Option<NaiveDate>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUnit {
    pub unit_type: Option<String>,
    pub serial_number: Option<String>,
    pub job_number: Option<String>,
    pub line_number: Option<i32>,
    pub manufacturer: Option<String>,
    pub model: Option<String>,
    pub description: Option<String>,
    pub location_in_site: Option<String>,
    pub status: Option<String>,
    pub install_date: Option<NaiveDate>,
    pub warranty_start_date: Option<NaiveDate>,
    pub warranty_end_date: Option<NaiveDate>,
    pub commission_level: Option<String>,
    pub operational_status: Option<String>,
    pub notes: Option<String>,
    pub rfe_job_number: Option<String>,
    pub rfe_wo_number: Option<String>,
    pub rfe_date: Option<NaiveDate>,
    pub rfe_description: Option<String>,
}

