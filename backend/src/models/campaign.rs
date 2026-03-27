use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, NaiveDate, Utc};

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct SiteCampaign {
    pub id:            Uuid,
    pub site_id:       Uuid,
    pub name:          String,
    pub campaign_type: String,
    pub description:   Option<String>,
    pub started_at:    Option<NaiveDate>,
    pub completed_at:  Option<NaiveDate>,
    pub created_at:    Option<DateTime<Utc>>,
    pub updated_at:    Option<DateTime<Utc>>,
    pub unit_ids:      Option<serde_json::Value>,
}

/// Returned by the list endpoint — includes progress aggregates.
#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct SiteCampaignWithProgress {
    pub id:             Uuid,
    pub site_id:        Uuid,
    pub name:           String,
    pub campaign_type:  String,
    pub description:    Option<String>,
    pub started_at:     Option<NaiveDate>,
    pub completed_at:   Option<NaiveDate>,
    pub created_at:     Option<DateTime<Utc>>,
    pub updated_at:     Option<DateTime<Utc>>,
    pub unit_ids:       Option<serde_json::Value>,
    pub units_total:    i64,
    pub units_complete: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreateSiteCampaign {
    pub name:          String,
    pub campaign_type: String,
    pub description:   Option<String>,
    pub started_at:    Option<NaiveDate>,
    pub unit_ids:      Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSiteCampaign {
    pub name:          Option<String>,
    pub campaign_type: Option<String>,
    pub description:   Option<String>,
    pub started_at:    Option<NaiveDate>,
    pub completed_at:  Option<NaiveDate>,
    pub unit_ids:      Option<serde_json::Value>,
}

// ── Unit campaign status ──────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct UnitCampaignStatus {
    pub id:           Uuid,
    pub campaign_id:  Uuid,
    pub unit_id:      Uuid,
    pub completed:    bool,
    pub completed_at: Option<DateTime<Utc>>,
    pub completed_by: Option<String>,
    pub notes:        Option<String>,
    pub created_at:   Option<DateTime<Utc>>,
    pub updated_at:   Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct SetUnitCampaignStatus {
    pub unit_id:      Uuid,
    pub completed:    bool,
    pub completed_by: Option<String>,
    pub notes:        Option<String>,
}
