use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, NaiveDate, Utc};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct UnitProgram {
    pub id:              Uuid,
    pub unit_id:         Uuid,
    pub controller_name: String,
    pub program_name:    String,
    pub version:         Option<String>,
    pub install_date:    Option<NaiveDate>,
    pub notes:           Option<String>,
    pub created_at:      Option<DateTime<Utc>>,
    pub updated_at:      Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateUnitProgram {
    pub controller_name: String,
    pub program_name:    String,
    pub version:         Option<String>,
    pub install_date:    Option<NaiveDate>,
    pub notes:           Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUnitProgram {
    pub controller_name: Option<String>,
    pub program_name:    Option<String>,
    pub version:         Option<String>,
    pub install_date:    Option<NaiveDate>,
    pub notes:           Option<String>,
}
