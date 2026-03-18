use axum::{
    extract::{Path, State},
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    models::commissioning::{CommissioningProject, UpdateCommissioningLevel},
};

pub async fn get_commissioning(
    State(pool): State<PgPool>,
    Path(unit_id): Path<Uuid>,
) -> Result<Json<CommissioningProject>> {
    // Get or create commissioning record for this unit
    let existing = sqlx::query_as::<_, CommissioningProject>(
        "SELECT * FROM public.commissioning_projects WHERE unit_id = $1 LIMIT 1"
    )
    .bind(unit_id)
    .fetch_optional(&pool)
    .await?;

    if let Some(cp) = existing {
        return Ok(Json(cp));
    }

    // Get site_id from unit
    let site_id: Option<Uuid> = sqlx::query_scalar(
        "SELECT site_id FROM public.units WHERE id = $1"
    )
    .bind(unit_id)
    .fetch_optional(&pool)
    .await?
    .flatten();

    let cp = sqlx::query_as::<_, CommissioningProject>(
        r#"INSERT INTO public.commissioning_projects
           (site_id, unit_id, l1_completed, l2_completed, l3_completed, l4_completed, l5_completed)
           VALUES ($1, $2, false, false, false, false, false)
           RETURNING *"#,
    )
    .bind(site_id)
    .bind(unit_id)
    .fetch_one(&pool)
    .await?;

    Ok(Json(cp))
}

pub async fn update_commissioning_level(
    State(pool): State<PgPool>,
    Path(unit_id): Path<Uuid>,
    Json(body): Json<UpdateCommissioningLevel>,
) -> Result<Json<CommissioningProject>> {
    if !(1..=5).contains(&body.level) {
        return Err(AppError::BadRequest("Level must be 1–5".to_string()));
    }

    // Ensure record exists
    let _ = get_commissioning(State(pool.clone()), Path(unit_id)).await?;

    let col_completed = format!("l{}_completed", body.level);
    let col_date = format!("l{}_date", body.level);
    let col_by = format!("l{}_completed_by", body.level);
    let col_url = format!("l{}_checklist_url", body.level);
    let col_fname = format!("l{}_checklist_filename", body.level);

    // Also update commission_level on the unit
    let level_str = if body.completed {
        format!("L{}", body.level)
    } else {
        let prev = body.level.saturating_sub(1);
        if prev == 0 { "none".to_string() } else { format!("L{}", prev) }
    };

    let query = format!(
        r#"UPDATE public.commissioning_projects SET
           {col_completed} = $2,
           {col_date} = $3,
           {col_by} = $4,
           {col_url} = COALESCE($5, {col_url}),
           {col_fname} = COALESCE($6, {col_fname}),
           updated_at = now()
           WHERE unit_id = $1
           RETURNING *"#,
    );

    let cp = sqlx::query_as::<_, CommissioningProject>(&query)
        .bind(unit_id)
        .bind(body.completed)
        .bind(body.date)
        .bind(&body.completed_by)
        .bind(&body.checklist_url)
        .bind(&body.checklist_filename)
        .fetch_optional(&pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Commissioning record not found".to_string()))?;

    // Update unit commission_level
    sqlx::query(
        "UPDATE public.units SET commission_level = $2 WHERE id = $1"
    )
    .bind(unit_id)
    .bind(&level_str)
    .execute(&pool)
    .await?;

    Ok(Json(cp))
}
