use axum::{
    body::Body,
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::Response,
};

use crate::handlers::auth::verify_token;

/// Extracts and validates a JWT Bearer token on non-GET requests.
/// Injects Claims into request extensions so handlers can access the user.
pub async fn require_auth(mut request: Request<Body>, next: Next) -> Result<Response, StatusCode> {
    // GET requests are public but still inject claims if token present (for /auth/me etc.)
    if request.method() == axum::http::Method::GET {
        if let Some(token) = request
            .headers()
            .get("Authorization")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.strip_prefix("Bearer "))
        {
            if let Some(claims) = verify_token(token) {
                request.extensions_mut().insert(claims);
            }
        }
        return Ok(next.run(request).await);
    }

    // Auth endpoints don't need a token
    let path = request.uri().path().to_string();
    if path.starts_with("/auth/login") || path.starts_with("/auth/setup") {
        return Ok(next.run(request).await);
    }

    let token = request
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .unwrap_or("");

    match verify_token(token) {
        Some(claims) => {
            request.extensions_mut().insert(claims);
            Ok(next.run(request).await)
        }
        None => Err(StatusCode::UNAUTHORIZED),
    }
}

/// Optional auth extractor — injects Claims if a valid token is present,
/// but does not block the request if missing (used on GET routes that need user context).
#[allow(dead_code)]
pub async fn optional_auth(mut request: Request<Body>, next: Next) -> Result<Response, StatusCode> {
    if let Some(token) = request
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
    {
        if let Some(claims) = verify_token(token) {
            request.extensions_mut().insert(claims);
        }
    }
    Ok(next.run(request).await)
}
