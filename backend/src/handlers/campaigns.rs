use axum::{
    extract::{Path, State},
    Json,
};
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    models::campaign::{
        CreateSiteCampaign, SetUnitCampaignStatus, SiteCampaign,
        SiteCampaignWithProgress, UnitCampaignStatus, UpdateSiteCampaign,
    },
};

// ── Site campaigns ────────────────────────────────────────────────────────

pub async fn list_campaigns(
    State(pool): State<PgPool>,
    Path(site_id): Path<Uuid>,
) -> Result<Json<Vec<SiteCampaignWithProgress>>> {
    let rows = sqlx::query_as::<_, SiteCampaignWithProgress>(
        r#"SELECT
               sc.id, sc.site_id, sc.name, sc.campaign_type, sc.description,
               sc.started_at, sc.completed_at, sc.created_at, sc.updated_at,
               sc.unit_ids,
               -- Total: if unit_ids set use array length, else all units+systems
               CASE
                 WHEN sc.unit_ids IS NOT NULL AND jsonb_array_length(sc.unit_ids) > 0
                   THEN jsonb_array_length(sc.unit_ids)
                 ELSE (
                   (SELECT COUNT(*) FROM public.units u
                    WHERE u.site_id = sc.site_id AND u.system_id IS NULL)
                   +
                   (SELECT COUNT(*) FROM public.sycool_systems ss
                    WHERE ss.site_id = sc.site_id)
                 )
               END AS units_total,
               -- Complete: count completed, filtered to unit_ids if set
               (
                 SELECT COUNT(DISTINCT ucs.unit_id)
                 FROM public.unit_campaign_status ucs
                 WHERE ucs.campaign_id = sc.id AND ucs.completed = true
                   AND (
                     sc.unit_ids IS NULL
                     OR jsonb_array_length(sc.unit_ids) = 0
                     OR ucs.unit_id::text IN (
                       SELECT jsonb_array_elements_text(sc.unit_ids)
                     )
                   )
               ) AS units_complete
           FROM public.site_campaigns sc
           WHERE sc.site_id = $1
           ORDER BY sc.created_at DESC"#,
    )
    .bind(site_id)
    .fetch_all(&pool)
    .await?;
    Ok(Json(rows))
}

pub async fn create_campaign(
    State(pool): State<PgPool>,
    Path(site_id): Path<Uuid>,
    Json(body): Json<CreateSiteCampaign>,
) -> Result<Json<SiteCampaign>> {
    let row = sqlx::query_as::<_, SiteCampaign>(
        r#"INSERT INTO public.site_campaigns
           (site_id, name, campaign_type, description, started_at, unit_ids)
           VALUES ($1,$2,$3,$4,$5,$6)
           RETURNING *"#,
    )
    .bind(site_id)
    .bind(&body.name)
    .bind(&body.campaign_type)
    .bind(&body.description)
    .bind(body.started_at)
    .bind(&body.unit_ids)
    .fetch_one(&pool)
    .await?;
    Ok(Json(row))
}

pub async fn update_campaign(
    State(pool): State<PgPool>,
    Path((site_id, campaign_id)): Path<(Uuid, Uuid)>,
    Json(body): Json<UpdateSiteCampaign>,
) -> Result<Json<SiteCampaign>> {
    let row = sqlx::query_as::<_, SiteCampaign>(
        r#"UPDATE public.site_campaigns SET
               name          = COALESCE($3, name),
               campaign_type = COALESCE($4, campaign_type),
               description   = COALESCE($5, description),
               started_at    = COALESCE($6, started_at),
               completed_at  = COALESCE($7, completed_at),
               unit_ids      = COALESCE($8, unit_ids),
               updated_at    = now()
           WHERE id = $1 AND site_id = $2
           RETURNING *"#,
    )
    .bind(campaign_id)
    .bind(site_id)
    .bind(&body.name)
    .bind(&body.campaign_type)
    .bind(&body.description)
    .bind(body.started_at)
    .bind(body.completed_at)
    .bind(&body.unit_ids)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Campaign {} not found", campaign_id)))?;
    Ok(Json(row))
}

pub async fn delete_campaign(
    State(pool): State<PgPool>,
    Path((site_id, campaign_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<serde_json::Value>> {
    sqlx::query(
        "DELETE FROM public.site_campaigns WHERE id = $1 AND site_id = $2",
    )
    .bind(campaign_id)
    .bind(site_id)
    .execute(&pool)
    .await?;
    Ok(Json(serde_json::json!({ "deleted": campaign_id })))
}

// ── Unit campaign status ──────────────────────────────────────────────────

/// List all unit statuses for a campaign.
pub async fn list_campaign_status(
    State(pool): State<PgPool>,
    Path(campaign_id): Path<Uuid>,
) -> Result<Json<Vec<UnitCampaignStatus>>> {
    let rows = sqlx::query_as::<_, UnitCampaignStatus>(
        "SELECT * FROM public.unit_campaign_status WHERE campaign_id = $1 ORDER BY updated_at DESC",
    )
    .bind(campaign_id)
    .fetch_all(&pool)
    .await?;
    Ok(Json(rows))
}

/// Upsert the completion status for one unit in a campaign.
pub async fn set_campaign_status(
    State(pool): State<PgPool>,
    Path(campaign_id): Path<Uuid>,
    Json(body): Json<SetUnitCampaignStatus>,
) -> Result<Json<UnitCampaignStatus>> {
    let completed_at = if body.completed {
        Some(Utc::now().naive_utc())
    } else {
        None
    };

    let row = sqlx::query_as::<_, UnitCampaignStatus>(
        r#"INSERT INTO public.unit_campaign_status
               (campaign_id, unit_id, completed, completed_at, completed_by, notes)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (campaign_id, unit_id) DO UPDATE SET
               completed    = EXCLUDED.completed,
               completed_at = EXCLUDED.completed_at,
               completed_by = EXCLUDED.completed_by,
               notes        = COALESCE(EXCLUDED.notes, unit_campaign_status.notes),
               updated_at   = now()
           RETURNING *"#,
    )
    .bind(campaign_id)
    .bind(body.unit_id)
    .bind(body.completed)
    .bind(completed_at)
    .bind(&body.completed_by)
    .bind(&body.notes)
    .fetch_one(&pool)
    .await?;
    Ok(Json(row))
}
