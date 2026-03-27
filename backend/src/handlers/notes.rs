use axum::{
    extract::{Multipart, Path, Query, State},
    Json,
};
use serde::Deserialize;
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::{
    error::{AppError, Result},
    models::note::{CreateNote, Note, UpdateNote},
};

pub async fn list_site_notes(
    State(pool): State<PgPool>,
    Path(site_id): Path<Uuid>,
) -> Result<Json<Vec<Note>>> {
    let notes = sqlx::query_as::<_, Note>(
        r#"SELECT id, site_id, unit_id, note_type, content, author, created_at, updated_at
           FROM public.notes
           WHERE site_id = $1 AND unit_id IS NULL
           ORDER BY created_at DESC"#,
    )
    .bind(site_id)
    .fetch_all(&pool)
    .await?;
    Ok(Json(notes))
}

pub async fn list_unit_notes(
    State(pool): State<PgPool>,
    Path(unit_id): Path<Uuid>,
) -> Result<Json<Vec<Note>>> {
    let notes = sqlx::query_as::<_, Note>(
        r#"SELECT id, site_id, unit_id, note_type, content, author, created_at, updated_at
           FROM public.notes
           WHERE unit_id = $1
           ORDER BY created_at DESC"#,
    )
    .bind(unit_id)
    .fetch_all(&pool)
    .await?;
    Ok(Json(notes))
}

#[derive(Deserialize)]
pub struct SearchQuery {
    pub q: Option<String>,
    pub site_id: Option<Uuid>,
    pub unit_id: Option<Uuid>,
}

pub async fn search_notes(
    State(pool): State<PgPool>,
    Query(params): Query<SearchQuery>,
) -> Result<Json<Vec<serde_json::Value>>> {
    let q = params.q.as_deref().unwrap_or("").to_lowercase();

    let rows = sqlx::query(
        r#"
        SELECT
            n.id,
            n.site_id,
            n.unit_id,
            n.note_type,
            n.content,
            n.author,
            n.created_at,
            n.updated_at,
            s.project_name          AS site_name,
            u.serial_number         AS unit_serial,
            u.asset_tag             AS unit_asset_tag,
            u.unit_type             AS unit_type
        FROM public.notes n
        LEFT JOIN public.sites s ON s.id = n.site_id
        LEFT JOIN public.units u ON u.id = n.unit_id
        WHERE
            ($1::TEXT = '' OR LOWER(n.content) LIKE '%' || $1 || '%'
             OR LOWER(COALESCE(n.author, '')) LIKE '%' || $1 || '%'
             OR LOWER(COALESCE(s.project_name, '')) LIKE '%' || $1 || '%'
             OR LOWER(COALESCE(u.serial_number, '')) LIKE '%' || $1 || '%'
             OR LOWER(COALESCE(u.asset_tag, '')) LIKE '%' || $1 || '%')
            AND ($2::UUID IS NULL OR n.site_id = $2)
            AND ($3::UUID IS NULL OR n.unit_id = $3)
        ORDER BY n.created_at DESC
        LIMIT 200
        "#,
    )
    .bind(q)
    .bind(params.site_id)
    .bind(params.unit_id)
    .fetch_all(&pool)
    .await?;

    let result: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|r| {
            serde_json::json!({
                "id":             r.get::<Uuid, _>("id"),
                "site_id":        r.get::<Option<Uuid>, _>("site_id"),
                "unit_id":        r.get::<Option<Uuid>, _>("unit_id"),
                "note_type":      r.get::<String, _>("note_type"),
                "content":        r.get::<String, _>("content"),
                "author":         r.get::<Option<String>, _>("author"),
                "created_at":     r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at"),
                "updated_at":     r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at"),
                "site_name":      r.get::<Option<String>, _>("site_name"),
                "unit_serial":    r.get::<Option<String>, _>("unit_serial"),
                "unit_asset_tag": r.get::<Option<String>, _>("unit_asset_tag"),
                "unit_type":      r.get::<Option<String>, _>("unit_type"),
            })
        })
        .collect();

    Ok(Json(result))
}

pub async fn create_site_note(
    State(pool): State<PgPool>,
    Path(site_id): Path<Uuid>,
    Json(body): Json<CreateNote>,
) -> Result<Json<Note>> {
    let note_type = body.note_type.as_deref().unwrap_or("note").to_string();
    let note = sqlx::query_as::<_, Note>(
        r#"INSERT INTO public.notes (site_id, unit_id, note_type, content, author)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, site_id, unit_id, note_type, content, author, created_at, updated_at"#,
    )
    .bind(site_id)
    .bind(body.unit_id)
    .bind(&note_type)
    .bind(&body.content)
    .bind(&body.author)
    .fetch_one(&pool)
    .await?;

    sqlx::query("UPDATE public.sites SET last_contact_date = NOW() WHERE id = $1")
        .bind(site_id)
        .execute(&pool)
        .await?;

    Ok(Json(note))
}

pub async fn create_unit_note(
    State(pool): State<PgPool>,
    Path(unit_id): Path<Uuid>,
    Json(body): Json<CreateNote>,
) -> Result<Json<Note>> {
    let note_type = body.note_type.as_deref().unwrap_or("note").to_string();
    let note = sqlx::query_as::<_, Note>(
        r#"INSERT INTO public.notes (site_id, unit_id, note_type, content, author)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, site_id, unit_id, note_type, content, author, created_at, updated_at"#,
    )
    .bind(body.site_id)
    .bind(unit_id)
    .bind(&note_type)
    .bind(&body.content)
    .bind(&body.author)
    .fetch_one(&pool)
    .await?;

    Ok(Json(note))
}

pub async fn update_note(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateNote>,
) -> Result<Json<Note>> {
    let note = sqlx::query_as::<_, Note>(
        r#"UPDATE public.notes SET
           note_type  = COALESCE($2, note_type),
           content    = COALESCE($3, content),
           author     = COALESCE($4, author),
           updated_at = NOW()
           WHERE id = $1
           RETURNING id, site_id, unit_id, note_type, content, author, created_at, updated_at"#,
    )
    .bind(id)
    .bind(&body.note_type)
    .bind(&body.content)
    .bind(&body.author)
    .fetch_optional(&pool)
    .await?
    .ok_or_else(|| AppError::NotFound(format!("Note {} not found", id)))?;
    Ok(Json(note))
}

pub async fn delete_note(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Result<Json<serde_json::Value>> {
    sqlx::query("DELETE FROM public.notes WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await?;
    Ok(Json(serde_json::json!({ "deleted": id })))
}

// ── Email PDF import ─────────────────────────────────────────────────────────
// POST /sites/:id/notes/import-email
// Accepts a PDF upload, extracts text, parses Outlook-style email chain,
// returns structured JSON for the frontend to preview and save as a note.

pub async fn import_email_pdf(
    State(_pool): State<PgPool>,
    Path(_site_id): Path<Uuid>,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>> {
    // Collect PDF bytes from multipart
    let mut pdf_bytes: Vec<u8> = Vec::new();
    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::Internal(anyhow::anyhow!(e)))? {
        let name = field.name().unwrap_or("").to_string();
        if name == "file" || name == "pdf" || name.is_empty() {
            pdf_bytes = field.bytes().await.map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?.to_vec();
        }
    }
    if pdf_bytes.is_empty() {
        return Err(AppError::BadRequest("No PDF file received".into()));
    }

    // Extract text using pdf-extract
    let raw_text = pdf_extract::extract_text_from_mem(&pdf_bytes)
        .map_err(|e| AppError::Internal(anyhow::anyhow!("PDF extraction failed: {}", e)))?;

    // Deduplicate characters — Outlook PDF exports often quadruple each character
    let text = deduplicate_pdf_text(&raw_text);

    // Parse into individual email messages
    let emails = parse_email_chain(&text);

    // Derive summary fields from the chain
    let subject = emails.first()
        .and_then(|e| e.get("subject"))
        .and_then(|s| s.as_str())
        .unwrap_or("Email Chain")
        .to_string();

    let participants: Vec<String> = {
        let mut seen = std::collections::HashSet::new();
        let mut names = Vec::new();
        for msg in &emails {
            for key in &["from_name", "to", "cc"] {
                if let Some(val) = msg.get(*key).and_then(|v| v.as_str()) {
                    for part in val.split(';').map(|s| s.trim().to_string()) {
                        // Extract just the name part (before <email>)
                        let name = if let Some(i) = part.find('<') {
                            part[..i].trim().to_string()
                        } else {
                            part.clone()
                        };
                        if !name.is_empty() && seen.insert(name.clone()) {
                            names.push(name);
                        }
                    }
                }
            }
        }
        names
    };

    Ok(Json(serde_json::json!({
        "subject": subject,
        "participants": participants,
        "email_count": emails.len(),
        "emails": emails,
    })))
}

/// Collapse runs of repeated characters — handles Outlook PDF export artifact
/// where each character appears 2–4 times: "HHeelllloo" → "Hello"
fn deduplicate_pdf_text(text: &str) -> String {
    // Detect duplication factor by sampling
    let chars: Vec<char> = text.chars().collect();
    if chars.len() < 8 {
        return text.to_string();
    }
    // Check if every letter repeats exactly 4 times
    let factor = [4usize, 3, 2].iter().copied().find(|&f| {
        let sample: Vec<char> = chars.iter().filter(|c| c.is_alphabetic()).take(40).copied().collect();
        if sample.len() < f * 4 { return false; }
        sample.chunks(f).take(8).all(|chunk| chunk.windows(2).all(|w| w[0] == w[1]))
    });

    match factor {
        Some(f) => {
            let mut out = String::with_capacity(text.len() / f);
            let mut i = 0;
            while i < chars.len() {
                let c = chars[i];
                if c.is_whitespace() {
                    out.push(c);
                    i += 1;
                } else {
                    out.push(c);
                    // Skip the next (f-1) occurrences of the same char
                    let mut skip = 1usize;
                    while skip < f && i + skip < chars.len() && chars[i + skip] == c {
                        skip += 1;
                    }
                    i += skip;
                }
            }
            out
        }
        None => text.to_string(),
    }
}

/// Parse an Outlook-format email chain into a Vec of JSON objects.
/// Handles both "From: … Sent: … To: …" (desktop) and
/// "From: … Date: … To: …" (web/mobile) header patterns.
fn parse_email_chain(text: &str) -> Vec<serde_json::Value> {
    let lines: Vec<&str> = text.lines().collect();
    let mut messages: Vec<serde_json::Value> = Vec::new();
    let mut i = 0;

    // Find boundaries — a message starts when we see "From:" followed by
    // "Sent:" or "Date:" within the next 6 lines.
    let mut boundaries: Vec<usize> = Vec::new();
    while i < lines.len() {
        let trimmed = lines[i].trim();
        if trimmed.starts_with("From:") {
            // Look for Sent:/Date: nearby
            let lookahead = (i + 1)..(i + 8).min(lines.len());
            if lookahead.clone().any(|j| {
                let l = lines[j].trim();
                l.starts_with("Sent:") || l.starts_with("Date:")
            }) {
                boundaries.push(i);
            }
        }
        i += 1;
    }

    if boundaries.is_empty() {
        // Fallback: return the entire text as a single message
        return vec![serde_json::json!({ "body": text.trim() })];
    }

    // Add sentinel
    boundaries.push(lines.len());

    for w in boundaries.windows(2) {
        let (start, end) = (w[0], w[1]);
        let block_lines = &lines[start..end];

        let mut from_raw = String::new();
        let mut from_name = String::new();
        let mut from_email = String::new();
        let mut sent = String::new();
        let mut to = String::new();
        let mut cc = String::new();
        let mut subject = String::new();
        let mut body_start = 0usize;

        let header_keys = ["From:", "Sent:", "Date:", "To:", "Cc:", "CC:", "Subject:"];
        let mut j = 0;
        while j < block_lines.len() {
            let line = block_lines[j].trim();
            if let Some(val) = line.strip_prefix("From:") {
                from_raw = val.trim().to_string();
                // Extract name and email from "Name <email>" or "Name (email)"
                if let (Some(a), Some(b)) = (from_raw.find('<'), from_raw.rfind('>')) {
                    from_name  = from_raw[..a].trim().to_string();
                    from_email = from_raw[a+1..b].trim().to_string();
                } else {
                    from_name = from_raw.clone();
                }
                j += 1;
            } else if line.starts_with("Sent:") {
                sent = line["Sent:".len()..].trim().to_string();
                j += 1;
            } else if line.starts_with("Date:") && sent.is_empty() {
                sent = line["Date:".len()..].trim().to_string();
                j += 1;
            } else if line.starts_with("To:") {
                to = line["To:".len()..].trim().to_string();
                j += 1;
                // Continuation lines (indented)
                while j < block_lines.len() && block_lines[j].starts_with('\t') {
                    to.push(' ');
                    to.push_str(block_lines[j].trim());
                    j += 1;
                }
            } else if line.starts_with("Cc:") || line.starts_with("CC:") {
                let prefix_len = if line.starts_with("Cc:") { 3 } else { 3 };
                cc = line[prefix_len..].trim().to_string();
                j += 1;
                while j < block_lines.len() && block_lines[j].starts_with('\t') {
                    cc.push(' ');
                    cc.push_str(block_lines[j].trim());
                    j += 1;
                }
            } else if line.starts_with("Subject:") {
                subject = line["Subject:".len()..].trim().to_string();
                j += 1;
            } else if header_keys.iter().any(|k| line.starts_with(k)) {
                j += 1; // skip other headers
            } else {
                body_start = j;
                break;
            }
        }

        // Skip blank lines before body
        while body_start < block_lines.len() && block_lines[body_start].trim().is_empty() {
            body_start += 1;
        }

        // Body: everything up to the next "-----Original Message-----" separator or end
        let body_lines: Vec<&str> = block_lines[body_start..].iter()
            .take_while(|l| !l.trim().starts_with("-----"))
            .map(|l| l.trim_end())
            .collect();
        let body = body_lines.join("\n").trim().to_string();

        messages.push(serde_json::json!({
            "from_name":  from_name,
            "from_email": from_email,
            "from_raw":   from_raw,
            "sent":       sent,
            "to":         to,
            "cc":         cc,
            "subject":    subject,
            "body":       body,
        }));
    }

    // Reverse so oldest is first
    messages.reverse();
    messages
}
