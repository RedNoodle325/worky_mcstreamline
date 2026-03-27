use axum::{
    extract::{Multipart, Path, State},
    Json,
};
use sqlx::PgPool;
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    models::site_document::SiteDocument,
};

pub async fn list_documents(
    State(pool): State<PgPool>,
    Path(site_id): Path<Uuid>,
) -> Result<Json<Vec<SiteDocument>>> {
    let docs = sqlx::query_as::<_, SiteDocument>(
        "SELECT * FROM public.site_documents WHERE site_id = $1 ORDER BY uploaded_at DESC"
    )
    .bind(site_id)
    .fetch_all(&pool)
    .await?;
    Ok(Json(docs))
}

pub async fn upload_document(
    State(pool): State<PgPool>,
    Path(site_id): Path<Uuid>,
    mut multipart: Multipart,
) -> Result<Json<SiteDocument>> {
    let upload_dir = std::env::var("UPLOAD_DIR").unwrap_or_else(|_| "./uploads".to_string());
    let docs_dir = format!("{}/documents/{}", upload_dir, site_id);
    std::fs::create_dir_all(&docs_dir).map_err(|e| AppError::Internal(e.into()))?;

    let mut file_url: Option<String> = None;
    let mut original_filename: Option<String> = None;
    let mut file_size: Option<i64> = None;
    let mut doc_type = String::from("submittal");
    let mut name: Option<String> = None;
    let mut description: Option<String> = None;

    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::Internal(anyhow::anyhow!(e)))? {
        match field.name().unwrap_or("") {
            "doc_type" => {
                doc_type = field.text().await.map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;
            }
            "name" => {
                name = Some(field.text().await.map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?);
            }
            "description" => {
                let v = field.text().await.map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;
                if !v.is_empty() { description = Some(v); }
            }
            "file" => {
                let orig = field.file_name().unwrap_or("file").to_string();
                let ext = std::path::Path::new(&orig)
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("bin");
                let stored_name = format!("{}.{}", Uuid::new_v4(), ext);
                let filepath = format!("{}/{}", docs_dir, stored_name);
                let bytes = field.bytes().await.map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;
                file_size = Some(bytes.len() as i64);
                std::fs::write(&filepath, &bytes).map_err(|e| AppError::Internal(e.into()))?;
                file_url = Some(format!("/uploads/documents/{}/{}", site_id, stored_name));
                original_filename = Some(orig);
            }
            _ => {}
        }
    }

    let url = file_url.ok_or_else(|| AppError::BadRequest("No 'file' field in upload".to_string()))?;
    let display_name = name.or_else(|| original_filename.clone()).unwrap_or_else(|| "Untitled".to_string());

    if !["submittal", "bom", "photo"].contains(&doc_type.as_str()) {
        return Err(AppError::BadRequest(format!("Invalid doc_type: {}", doc_type)));
    }

    let doc = sqlx::query_as::<_, SiteDocument>(
        r#"INSERT INTO public.site_documents (site_id, doc_type, name, original_filename, url, file_size, description)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *"#
    )
    .bind(site_id)
    .bind(&doc_type)
    .bind(&display_name)
    .bind(&original_filename)
    .bind(&url)
    .bind(file_size)
    .bind(&description)
    .fetch_one(&pool)
    .await?;

    Ok(Json(doc))
}

pub async fn delete_document(
    State(pool): State<PgPool>,
    Path((site_id, doc_id)): Path<(Uuid, Uuid)>,
) -> Result<Json<serde_json::Value>> {
    let doc = sqlx::query_as::<_, SiteDocument>(
        "SELECT * FROM public.site_documents WHERE id = $1 AND site_id = $2"
    )
    .bind(doc_id)
    .bind(site_id)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Document not found".to_string()))?;

    // Delete file from disk
    let upload_dir = std::env::var("UPLOAD_DIR").unwrap_or_else(|_| "./uploads".to_string());
    let disk_path = format!("{}{}", upload_dir, doc.url.trim_start_matches("/uploads"));
    let _ = std::fs::remove_file(&disk_path);

    sqlx::query("DELETE FROM public.site_documents WHERE id = $1")
        .bind(doc_id)
        .execute(&pool)
        .await?;

    Ok(Json(serde_json::json!({ "deleted": doc_id })))
}
