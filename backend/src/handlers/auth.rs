use axum::{extract::State, http::StatusCode, Json};
use bcrypt::{hash, verify, DEFAULT_COST};
use chrono::{Duration, Utc};
use jsonwebtoken::{encode, DecodingKey, EncodingKey, Header, Validation, decode};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use crate::error::{AppError, Result};

// ── JWT Claims ──────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,   // user id
    pub email: String,
    pub name: Option<String>,
    pub exp: i64,      // unix timestamp
    pub iat: i64,
}

pub fn jwt_secret() -> Vec<u8> {
    std::env::var("JWT_SECRET")
        .expect("JWT_SECRET must be set")
        .into_bytes()
}

pub fn verify_token(token: &str) -> Option<Claims> {
    let secret = jwt_secret();
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(&secret),
        &Validation::default(),
    )
    .ok()
    .map(|d| d.claims)
}

// ── Request / Response types ────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct SetupRequest {
    pub email: String,
    pub password: String,
    pub display_name: Option<String>,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub email: String,
    pub display_name: Option<String>,
}

// ── Handlers ────────────────────────────────────────────────────────────────

/// POST /auth/login — validate credentials, return JWT
pub async fn login(
    State(pool): State<PgPool>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<AuthResponse>> {
    let row = sqlx::query!(
        "SELECT id, email, password_hash, display_name FROM public.users WHERE email = $1",
        body.email.to_lowercase()
    )
    .fetch_optional(&pool)
    .await?;

    let user = row.ok_or_else(|| AppError::Unauthorized("Invalid email or password".into()))?;

    let valid = verify(&body.password, &user.password_hash)
        .map_err(|_| AppError::Unauthorized("Invalid email or password".into()))?;

    if !valid {
        return Err(AppError::Unauthorized("Invalid email or password".into()));
    }

    // Update last_login
    sqlx::query!("UPDATE public.users SET last_login = NOW() WHERE id = $1", user.id)
        .execute(&pool)
        .await?;

    let token = make_token(user.id.to_string(), &user.email, &user.display_name)?;

    Ok(Json(AuthResponse {
        token,
        email: user.email,
        display_name: user.display_name,
    }))
}

/// POST /auth/setup — create the first user (only works when no users exist)
pub async fn setup(
    State(pool): State<PgPool>,
    Json(body): Json<SetupRequest>,
) -> Result<Json<AuthResponse>> {
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM public.users")
        .fetch_one(&pool)
        .await?;

    if count > 0 {
        return Err(AppError::Unauthorized(
            "Setup already complete. Use login instead.".into(),
        ));
    }

    if body.password.len() < 8 {
        return Err(AppError::BadRequest("Password must be at least 8 characters".into()));
    }

    let hash = hash(&body.password, DEFAULT_COST)
        .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;

    let row = sqlx::query!(
        "INSERT INTO public.users (email, password_hash, display_name)
         VALUES ($1, $2, $3)
         RETURNING id, email, display_name",
        body.email.to_lowercase(),
        hash,
        body.display_name
    )
    .fetch_one(&pool)
    .await?;

    let token = make_token(row.id.to_string(), &row.email, &row.display_name)?;

    Ok(Json(AuthResponse {
        token,
        email: row.email,
        display_name: row.display_name,
    }))
}

/// GET /auth/me — returns user info if token is valid
pub async fn me(
    State(pool): State<PgPool>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
) -> Result<Json<serde_json::Value>> {
    let _ = pool; // future: refresh user data
    Ok(Json(serde_json::json!({
        "email": claims.email,
        "display_name": claims.name,
    })))
}

// ── Change password ──────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

pub async fn change_password(
    State(pool): State<PgPool>,
    axum::extract::Extension(claims): axum::extract::Extension<Claims>,
    Json(body): Json<ChangePasswordRequest>,
) -> Result<StatusCode> {
    if body.new_password.len() < 8 {
        return Err(AppError::BadRequest("Password must be at least 8 characters".into()));
    }

    let row = sqlx::query!(
        "SELECT password_hash FROM public.users WHERE email = $1",
        claims.email
    )
    .fetch_one(&pool)
    .await?;

    let valid = verify(&body.current_password, &row.password_hash)
        .map_err(|_| AppError::Unauthorized("Current password is incorrect".into()))?;

    if !valid {
        return Err(AppError::Unauthorized("Current password is incorrect".into()));
    }

    let new_hash = hash(&body.new_password, DEFAULT_COST)
        .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))?;

    sqlx::query!(
        "UPDATE public.users SET password_hash = $1 WHERE email = $2",
        new_hash,
        claims.email
    )
    .execute(&pool)
    .await?;

    Ok(StatusCode::NO_CONTENT)
}

// ── Users list ────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct UserSummary {
    pub id: uuid::Uuid,
    pub email: String,
    pub display_name: Option<String>,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// GET /users — returns all users (no password hashes)
pub async fn list_users(
    State(pool): State<PgPool>,
) -> Result<Json<Vec<UserSummary>>> {
    let rows = sqlx::query!(
        "SELECT id, email, display_name, created_at FROM public.users ORDER BY email ASC"
    )
    .fetch_all(&pool)
    .await?;

    let users = rows
        .into_iter()
        .map(|r| UserSummary {
            id: r.id,
            email: r.email,
            display_name: r.display_name,
            created_at: Some(r.created_at),
        })
        .collect();

    Ok(Json(users))
}

// ── Helper ───────────────────────────────────────────────────────────────────

fn make_token(sub: String, email: &str, name: &Option<String>) -> Result<String> {
    let now = Utc::now();
    let claims = Claims {
        sub,
        email: email.to_string(),
        name: name.clone(),
        iat: now.timestamp(),
        exp: (now + Duration::hours(8)).timestamp(),
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(&jwt_secret()),
    )
    .map_err(|e| AppError::Internal(anyhow::anyhow!(e)))
}
