use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::NaiveDateTime;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Site {
    pub id: Uuid,
    pub name: Option<String>,
    // Site / physical address
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    // Shipping address (where parts go)
    pub shipping_address_street: Option<String>,
    pub shipping_address_city: Option<String>,
    pub shipping_address_state: Option<String>,
    pub shipping_address_zip: Option<String>,
    // Access & paperwork
    pub access_requirements: Option<String>,
    pub required_paperwork: Option<String>,
    pub orientation_info: Option<String>,
    // Customer contact
    pub customer_contact_phone: Option<String>,
    pub customer_contact_email: Option<String>,
    pub notes: Option<String>,
    pub logo_url: Option<String>,
    pub logo_filename: Option<String>,
    pub last_contact_date: Option<chrono::NaiveDate>,
    pub techs_on_site: Option<bool>,
    pub created_at: Option<NaiveDateTime>,
    pub updated_at: Option<NaiveDateTime>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSite {
    pub name: String,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub shipping_address_street: Option<String>,
    pub shipping_address_city: Option<String>,
    pub shipping_address_state: Option<String>,
    pub shipping_address_zip: Option<String>,
    pub access_requirements: Option<String>,
    pub required_paperwork: Option<String>,
    pub orientation_info: Option<String>,
    pub customer_contact_phone: Option<String>,
    pub customer_contact_email: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSite {
    pub name: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub shipping_address_street: Option<String>,
    pub shipping_address_city: Option<String>,
    pub shipping_address_state: Option<String>,
    pub shipping_address_zip: Option<String>,
    pub access_requirements: Option<String>,
    pub required_paperwork: Option<String>,
    pub orientation_info: Option<String>,
    pub customer_contact_phone: Option<String>,
    pub customer_contact_email: Option<String>,
    pub notes: Option<String>,
    pub last_contact_date: Option<chrono::NaiveDate>,
    pub techs_on_site: Option<bool>,
}
