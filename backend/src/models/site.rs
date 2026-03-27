use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::NaiveDateTime;
use crate::models::site_job_number::CreateSiteJobNumber;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Site {
    pub id: Uuid,
    // Required identifiers
    pub project_number: String,
    pub project_name: String,
    // Customer info
    pub customer_name: Option<String>,
    pub name: Option<String>,
    // Site / physical address
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    // Primary point of contact (DB columns)
    pub point_of_contact: Option<String>,
    pub poc_phone: Option<String>,
    pub poc_email: Option<String>,
    // Customer contact (legacy columns)
    pub customer_contact_name: Option<String>,
    pub customer_contact_phone: Option<String>,
    pub customer_contact_email: Option<String>,
    // Shipping address (where parts go)
    pub shipping_name: Option<String>,
    pub shipping_contact_name: Option<String>,
    pub shipping_contact_phone: Option<String>,
    pub shipping_address_street: Option<String>,
    pub shipping_address_city: Option<String>,
    pub shipping_address_state: Option<String>,
    pub shipping_address_zip: Option<String>,
    // Access & paperwork
    pub access_requirements: Option<String>,
    pub required_paperwork: Option<String>,
    pub orientation_info: Option<String>,
    // Misc
    pub notes: Option<String>,
    pub logo_url: Option<String>,
    pub logo_filename: Option<String>,
    pub last_contact_date: Option<chrono::NaiveDate>,
    pub techs_on_site: bool,
    pub active: Option<bool>,
    pub project_manager_id: Option<Uuid>,
    pub lifecycle_phase: String,
    pub site_status: String,
    pub warranty_start_date: Option<chrono::NaiveDate>,
    pub warranty_end_date: Option<chrono::NaiveDate>,
    pub extended_warranty_start: Option<chrono::NaiveDate>,
    pub extended_warranty_end: Option<chrono::NaiveDate>,
    pub astea_site_id: Option<String>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSite {
    pub project_number: String,
    pub project_name: String,
    pub customer_name: Option<String>,
    pub name: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub point_of_contact: Option<String>,
    pub poc_phone: Option<String>,
    pub poc_email: Option<String>,
    pub customer_contact_name: Option<String>,
    pub customer_contact_phone: Option<String>,
    pub customer_contact_email: Option<String>,
    pub shipping_name: Option<String>,
    pub shipping_contact_name: Option<String>,
    pub shipping_contact_phone: Option<String>,
    pub shipping_address_street: Option<String>,
    pub shipping_address_city: Option<String>,
    pub shipping_address_state: Option<String>,
    pub shipping_address_zip: Option<String>,
    pub access_requirements: Option<String>,
    pub required_paperwork: Option<String>,
    pub orientation_info: Option<String>,
    pub notes: Option<String>,
    pub active: Option<bool>,
    pub project_manager_id: Option<Uuid>,
    pub astea_site_id: Option<String>,
    /// Job numbers to create alongside the site (not stored on the site row itself)
    #[serde(default)]
    pub job_numbers: Vec<CreateSiteJobNumber>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSite {
    pub project_number: Option<String>,
    pub project_name: Option<String>,
    pub customer_name: Option<String>,
    pub name: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub point_of_contact: Option<String>,
    pub poc_phone: Option<String>,
    pub poc_email: Option<String>,
    pub customer_contact_name: Option<String>,
    pub customer_contact_phone: Option<String>,
    pub customer_contact_email: Option<String>,
    pub shipping_name: Option<String>,
    pub shipping_contact_name: Option<String>,
    pub shipping_contact_phone: Option<String>,
    pub shipping_address_street: Option<String>,
    pub shipping_address_city: Option<String>,
    pub shipping_address_state: Option<String>,
    pub shipping_address_zip: Option<String>,
    pub access_requirements: Option<String>,
    pub required_paperwork: Option<String>,
    pub orientation_info: Option<String>,
    pub notes: Option<String>,
    pub last_contact_date: Option<chrono::NaiveDate>,
    pub techs_on_site: Option<bool>,
    pub active: Option<bool>,
    pub project_manager_id: Option<Uuid>,
    pub lifecycle_phase: Option<String>,
    pub site_status: Option<String>,
    pub warranty_start_date: Option<chrono::NaiveDate>,
    pub warranty_end_date: Option<chrono::NaiveDate>,
    pub extended_warranty_start: Option<chrono::NaiveDate>,
    pub extended_warranty_end: Option<chrono::NaiveDate>,
    pub astea_site_id: Option<String>,
}
