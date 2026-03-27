use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    models::todo::{CreateTodo, Todo, UpdateTodo},
};

#[derive(Deserialize)]
pub struct TodoFilter {
    pub site_id: Option<Uuid>,
    pub status: Option<String>,
}

pub async fn list_todos(
    State(pool): State<PgPool>,
    Query(params): Query<TodoFilter>,
) -> Result<Json<Vec<Todo>>> {
    let todos = sqlx::query_as::<_, Todo>(
        r#"SELECT t.*, COALESCE(s.project_name, '') as _site_name
           FROM public.todos t
           LEFT JOIN public.sites s ON s.id = t.site_id
           WHERE ($1::UUID IS NULL OR t.site_id = $1)
             AND ($2::TEXT IS NULL OR t.status = $2)
           ORDER BY
             CASE t.status WHEN 'done' THEN 1 ELSE 0 END,
             CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 WHEN 'low' THEN 3 ELSE 4 END,
             t.due_date ASC NULLS LAST,
             t.created_at DESC"#,
    )
    .bind(params.site_id)
    .bind(params.status)
    .fetch_all(&pool)
    .await?;
    Ok(Json(todos))
}

pub async fn create_todo(
    State(pool): State<PgPool>,
    Json(body): Json<CreateTodo>,
) -> Result<Json<Todo>> {
    let todo = sqlx::query_as::<_, Todo>(
        r#"INSERT INTO public.todos (title, description, site_id, priority, due_date)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *"#,
    )
    .bind(&body.title)
    .bind(&body.description)
    .bind(body.site_id)
    .bind(body.priority.as_deref().unwrap_or("normal"))
    .bind(body.due_date)
    .fetch_one(&pool)
    .await?;
    Ok(Json(todo))
}

pub async fn update_todo(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateTodo>,
) -> Result<Json<Todo>> {
    let todo = sqlx::query_as::<_, Todo>(
        r#"UPDATE public.todos SET
           title       = COALESCE($2, title),
           description = COALESCE($3, description),
           site_id     = CASE WHEN $4::BOOLEAN THEN $5 ELSE site_id END,
           status      = COALESCE($6, status),
           priority    = COALESCE($7, priority),
           due_date    = COALESCE($8, due_date),
           updated_at  = NOW()
           WHERE id = $1
           RETURNING *"#,
    )
    .bind(id)
    .bind(&body.title)
    .bind(&body.description)
    .bind(body.site_id.is_some())
    .bind(body.site_id)
    .bind(&body.status)
    .bind(&body.priority)
    .bind(body.due_date)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Todo {} not found", id)))?;
    Ok(Json(todo))
}

pub async fn delete_todo(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    sqlx::query("DELETE FROM public.todos WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await?;
    Ok(Json(serde_json::json!({ "deleted": id })))
}
