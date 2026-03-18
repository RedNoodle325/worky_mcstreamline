use axum::{
    routing::{get, post, put},
    Router,
};
use sqlx::PgPool;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;

use crate::handlers::{
    bom, commissioning, contractors, site_contacts, site_forms, site_job_numbers, sites, tickets, units, warranty,
};

pub fn build_router(pool: PgPool, frontend_dir: &str, upload_dir: &str) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let api = Router::new()
        // Sites
        .route("/sites", get(sites::list_sites).post(sites::create_site))
        .route("/sites/:id", get(sites::get_site).put(sites::update_site).delete(sites::delete_site))
        .route("/sites/:id/logo", post(sites::upload_logo))
        // Site contacts
        .route("/sites/:id/contacts", get(site_contacts::list_contacts).post(site_contacts::create_contact))
        .route("/sites/:id/contacts/:contact_id", put(site_contacts::update_contact).delete(site_contacts::delete_contact))
        // Site job numbers
        .route("/sites/:id/job-numbers", get(site_job_numbers::list_job_numbers).post(site_job_numbers::create_job_number))
        .route("/sites/:id/job-numbers/:job_id", put(site_job_numbers::update_job_number).delete(site_job_numbers::delete_job_number))
        // Site form templates
        .route("/sites/:id/forms", get(site_forms::list_forms).post(site_forms::create_form))
        .route("/sites/:id/forms/:form_id", put(site_forms::update_form).delete(site_forms::delete_form))
        // Units
        .route("/units", get(units::list_units).post(units::create_unit))
        .route("/units/:id", get(units::get_unit).put(units::update_unit).delete(units::delete_unit))
        .route("/units/:id/commissioning", get(commissioning::get_commissioning))
        .route("/units/:id/commissioning/level", put(commissioning::update_commissioning_level))
        // Tickets (issues)
        .route("/tickets", get(tickets::list_tickets).post(tickets::create_ticket))
        .route("/tickets/:id", get(tickets::get_ticket).put(tickets::update_ticket).delete(tickets::delete_ticket))
        // Contractors
        .route("/contractors", get(contractors::list_contractors).post(contractors::create_contractor))
        .route("/contractors/:id", get(contractors::get_contractor).put(contractors::update_contractor).delete(contractors::delete_contractor))
        // BOM
        .route("/bom", get(bom::list_bom_imports))
        .route("/bom/import", post(bom::import_bom))
        .route("/bom/:id/items", get(bom::get_bom_items))
        .route("/parts/search", get(bom::search_parts))
        // Warranty
        .route("/warranty", get(warranty::list_warranty_claims).post(warranty::create_warranty_claim))
        .route("/warranty/:id", get(warranty::get_warranty_claim).put(warranty::update_warranty_claim).delete(warranty::delete_warranty_claim))
        .with_state(pool);

    Router::new()
        .nest("/api", api)
        .nest_service("/uploads", ServeDir::new(upload_dir))
        .fallback_service(ServeDir::new(frontend_dir))
        .layer(cors)
}
