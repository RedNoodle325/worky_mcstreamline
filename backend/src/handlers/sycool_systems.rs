use axum::{
    extract::{Path, State},
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    models::sycool_system::{CreateSyCoolSystem, SyCoolSystem, SyCoolSystemWithUnits, UpdateSyCoolSystem},
};

/// GET /sites/:site_id/systems
/// Returns all SyCool systems for a site, each with its ACCU and CRAC unit embedded.
pub async fn list_systems(
    State(pool): State<PgPool>,
    Path(site_id): Path<Uuid>,
) -> Result<Json<Vec<SyCoolSystemWithUnits>>> {
    let systems = sqlx::query_as::<_, SyCoolSystemWithUnits>(
        r#"
        SELECT
            s.id,
            s.site_id,
            s.data_hall,
            s.system_number,
            s.created_at,
            s.updated_at,
            to_json(
                (SELECT row_to_json(r) FROM (
                    SELECT u.id, u.asset_tag, u.serial_number, u.commission_level, u.status, u.notes
                    FROM units u
                    WHERE u.system_id = s.id AND u.unit_type = 'ACCU'
                    LIMIT 1
                ) r)
            ) AS accu,
            to_json(
                (SELECT row_to_json(r) FROM (
                    SELECT u.id, u.asset_tag, u.serial_number, u.commission_level, u.status, u.notes
                    FROM units u
                    WHERE u.system_id = s.id AND u.unit_type = 'CRAC'
                    LIMIT 1
                ) r)
            ) AS crac
        FROM sycool_systems s
        WHERE s.site_id = $1
        ORDER BY s.data_hall, s.system_number
        "#,
    )
    .bind(site_id)
    .fetch_all(&pool)
    .await?;

    Ok(Json(systems))
}

/// GET /systems/:id
pub async fn get_system(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<SyCoolSystemWithUnits>> {
    let system = sqlx::query_as::<_, SyCoolSystemWithUnits>(
        r#"
        SELECT
            s.id,
            s.site_id,
            s.data_hall,
            s.system_number,
            s.created_at,
            s.updated_at,
            to_json(
                (SELECT row_to_json(r) FROM (
                    SELECT u.id, u.asset_tag, u.serial_number, u.commission_level, u.status, u.notes
                    FROM units u
                    WHERE u.system_id = s.id AND u.unit_type = 'ACCU'
                    LIMIT 1
                ) r)
            ) AS accu,
            to_json(
                (SELECT row_to_json(r) FROM (
                    SELECT u.id, u.asset_tag, u.serial_number, u.commission_level, u.status, u.notes
                    FROM units u
                    WHERE u.system_id = s.id AND u.unit_type = 'CRAC'
                    LIMIT 1
                ) r)
            ) AS crac
        FROM sycool_systems s
        WHERE s.id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("System {} not found", id)))?;

    Ok(Json(system))
}

/// POST /sites/:site_id/systems
pub async fn create_system(
    State(pool): State<PgPool>,
    Path(site_id): Path<Uuid>,
    Json(body): Json<CreateSyCoolSystem>,
) -> Result<Json<SyCoolSystem>> {
    let system = sqlx::query_as::<_, SyCoolSystem>(
        r#"INSERT INTO sycool_systems (site_id, data_hall, system_number)
           VALUES ($1, $2, $3)
           RETURNING *"#,
    )
    .bind(site_id)
    .bind(&body.data_hall)
    .bind(&body.system_number)
    .fetch_one(&pool)
    .await?;

    Ok(Json(system))
}

/// PUT /systems/:id
pub async fn update_system(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateSyCoolSystem>,
) -> Result<Json<SyCoolSystem>> {
    let system = sqlx::query_as::<_, SyCoolSystem>(
        r#"UPDATE sycool_systems SET
           data_hall     = COALESCE($2, data_hall),
           system_number = COALESCE($3, system_number),
           updated_at    = now()
           WHERE id = $1
           RETURNING *"#,
    )
    .bind(id)
    .bind(&body.data_hall)
    .bind(&body.system_number)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("System {} not found", id)))?;

    Ok(Json(system))
}

/// DELETE /systems/:id
pub async fn delete_system(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    sqlx::query("DELETE FROM sycool_systems WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await?;
    Ok(Json(serde_json::json!({ "deleted": id })))
}
