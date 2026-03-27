use axum::{
    middleware,
    routing::{delete, get, post, put},
    Router,
};
use sqlx::PgPool;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;

use crate::handlers::{
    auth, bom, campaigns, commissioning, components, contractors, issue_line_links, issues,
    materials, msow, notes, schedule, service_tickets, site_contacts, site_documents, site_forms,
    site_job_numbers, sites, sycool_systems, tickets, unit_programs, units, warranty, todos,
};
use crate::middleware::require_auth;

pub fn build_router(pool: PgPool, frontend_dir: &str, upload_dir: &str) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let api = Router::new()
        // Auth
        .route("/auth/login",           post(auth::login))
        .route("/auth/setup",           post(auth::setup))
        .route("/auth/me",              get(auth::me))
        .route("/auth/change-password", post(auth::change_password))
        // Sites
        .route("/sites", get(sites::list_sites).post(sites::create_site))
        .route("/sites/:id", get(sites::get_site).put(sites::update_site).delete(sites::delete_site))
        .route("/sites/:id/logo", post(sites::upload_logo))
        // Site documents
        .route("/sites/:id/documents", get(site_documents::list_documents).post(site_documents::upload_document))
        .route("/sites/:id/documents/:doc_id", delete(site_documents::delete_document))
        // Site contacts
        .route("/sites/:id/contacts", get(site_contacts::list_contacts).post(site_contacts::create_contact))
        .route("/sites/:id/contacts/:contact_id", put(site_contacts::update_contact).delete(site_contacts::delete_contact))
        // Site job numbers
        .route("/sites/:id/job-numbers", get(site_job_numbers::list_job_numbers).post(site_job_numbers::create_job_number))
        .route("/sites/:id/job-numbers/:job_id", put(site_job_numbers::update_job_number).delete(site_job_numbers::delete_job_number))
        // Site form templates
        .route("/sites/:id/forms", get(site_forms::list_forms).post(site_forms::create_form))
        .route("/sites/:id/forms/:form_id", put(site_forms::update_form).delete(site_forms::delete_form))
        // Site campaigns
        .route("/sites/:id/campaigns", get(campaigns::list_campaigns).post(campaigns::create_campaign))
        .route("/sites/:id/campaigns/:campaign_id", put(campaigns::update_campaign).delete(campaigns::delete_campaign))
        // Campaign unit status
        .route("/campaigns/:campaign_id/status", get(campaigns::list_campaign_status).put(campaigns::set_campaign_status))
        // Units
        .route("/units", get(units::list_units).post(units::create_unit))
        .route("/units/:id", get(units::get_unit).put(units::update_unit).delete(units::delete_unit))
        .route("/units/:id/operational-status", put(units::set_operational_status))
        .route("/sites/:id/units/import", post(units::import_units_csv))
        .route("/units/:id/commissioning", get(commissioning::get_commissioning))
        .route("/units/:id/commissioning/level", put(commissioning::update_commissioning_level))
        // Unit programs
        .route("/units/:id/programs", get(unit_programs::list_programs).post(unit_programs::create_program))
        .route("/units/:id/programs/:program_id", put(unit_programs::update_program).delete(unit_programs::delete_program))
        // SyCool systems
        .route("/sites/:id/systems", get(sycool_systems::list_systems).post(sycool_systems::create_system))
        .route("/systems/:id", get(sycool_systems::get_system).put(sycool_systems::update_system).delete(sycool_systems::delete_system))
        // Tickets (issues)
        .route("/tickets", get(tickets::list_tickets).post(tickets::create_ticket))
        .route("/tickets/:id", get(tickets::get_ticket).put(tickets::update_ticket).delete(tickets::delete_ticket))
        .route("/sites/:id/issues/import-cxalloy", post(tickets::import_cxalloy_issues))
        // Issues (commissioning)
        .route("/issues", get(issues::list_all_issues))
        .route("/issues/:id", put(issues::update_issue).delete(issues::delete_issue))
        .route("/sites/:id/issues", get(issues::list_site_issues).post(issues::create_issue))
        .route("/units/:id/issues", get(issues::list_unit_issues))
        // Service tickets (CS tickets)
        .route("/service-tickets", get(service_tickets::list_all_tickets))
        .route("/service-tickets/import-xml", post(service_tickets::import_xml_tickets))
        .route("/sites/:id/service-tickets", get(service_tickets::list_site_tickets).post(service_tickets::create_ticket))
        .route("/service-tickets/:id", get(service_tickets::get_ticket).put(service_tickets::update_ticket).delete(service_tickets::delete_ticket))
        // Bulk commission update
        .route("/sites/:id/units/commission-bulk", put(units::bulk_update_commission))
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
        // Notes
        .route("/sites/:id/notes", get(notes::list_site_notes).post(notes::create_site_note))
        .route("/sites/:id/notes/import-email", post(notes::import_email_pdf))
        .route("/units/:id/notes", get(notes::list_unit_notes).post(notes::create_unit_note))
        .route("/notes/search", get(notes::search_notes))
        .route("/notes/:id", put(notes::update_note).delete(notes::delete_note))
        // Material history
        .route("/units/:id/materials", get(materials::list_unit_materials).post(materials::create_material))
        .route("/units/:unit_id/materials/:id", put(materials::update_material).delete(materials::delete_material))
        // Unit components + component updates
        .route("/units/:id/components", get(components::list_components).post(components::create_component))
        .route("/units/:unit_id/components/:id", put(components::update_component).delete(components::delete_component))
        .route("/components/:id/updates", get(components::list_component_updates).post(components::create_component_update))
        .route("/components/:comp_id/updates/:id", put(components::update_component_update).delete(components::delete_component_update))
        // Todos
        .route("/todos", get(todos::list_todos).post(todos::create_todo))
        .route("/todos/:id", put(todos::update_todo).delete(todos::delete_todo))
        // Users
        .route("/users", get(auth::list_users))
        // Technicians
        .route("/technicians", get(schedule::list_technicians).post(schedule::create_technician))
        .route("/technicians/:id", put(schedule::update_technician).delete(schedule::delete_technician))
        // Job schedule
        .route("/job-schedule", get(schedule::list_jobs).post(schedule::create_job))
        .route("/job-schedule/:id", put(schedule::update_job).delete(schedule::delete_job))
        .route("/job-schedule/:id/techs", get(schedule::list_job_techs).post(schedule::assign_tech))
        .route("/job-schedule/:id/techs/:tech_id", delete(schedule::remove_tech))
        // Dispatch
        .route("/dispatch/techs-for-site/:site_id", get(schedule::get_techs_for_site))
        // Issue ↔ service-line links
        .route("/issue-line-links", get(issue_line_links::list_all_links))
        .route("/service-tickets/:id/line-links", get(issue_line_links::list_ticket_links).post(issue_line_links::create_link))
        .route("/service-tickets/:id/line-links/bulk", post(issue_line_links::bulk_link))
        .route("/service-tickets/:id/line-links/:link_id", delete(issue_line_links::delete_link))
        // MSOW drafts
        .route("/msow-drafts", get(msow::list_drafts).post(msow::create_draft))
        .route("/msow-drafts/:id", get(msow::get_draft).put(msow::update_draft).delete(msow::delete_draft))
        // Auth check — POST returns 200 if password is correct, 401 if not (middleware handles it)
        .route("/auth-check", post(|| async { axum::http::StatusCode::OK }))
        .with_state(pool)
        .layer(middleware::from_fn(require_auth));

    Router::new()
        .nest("/api", api)
        .nest_service("/uploads", ServeDir::new(upload_dir))
        .fallback_service(ServeDir::new(frontend_dir))
        .layer(cors)
}
