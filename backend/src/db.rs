use sqlx::{postgres::{PgConnectOptions, PgPoolOptions}, PgPool};
use anyhow::Result;
use std::str::FromStr;

pub async fn create_pool(database_url: &str) -> Result<PgPool> {
    let connect_options = PgConnectOptions::from_str(database_url)?
        .statement_cache_capacity(0); // required for PgBouncer session-mode pooler

    let pool = PgPoolOptions::new()
        .max_connections(5) // stay under Supabase session-mode pool_size limit
        .connect_with(connect_options)
        .await?;
    tracing::info!("Database connection pool created");

    run_migrations(&pool).await?;

    Ok(pool)
}

async fn run_migrations(pool: &PgPool) -> Result<()> {
    // Base schema — all CREATE TABLE IF NOT EXISTS so safe to run against existing DBs
    sqlx::query("CREATE TABLE IF NOT EXISTS public.sites (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_number text NOT NULL,
        project_name text NOT NULL,
        customer_name text, address text, city text, state text, zip_code text,
        point_of_contact text, poc_phone text, poc_email text,
        active boolean DEFAULT true,
        created_at timestamp without time zone DEFAULT now(),
        updated_at timestamp without time zone DEFAULT now(),
        notes text, orientation_info text, project_manager_id uuid,
        shipping_address_street text, shipping_address_city text,
        shipping_address_state text, shipping_address_zip text,
        access_requirements text, required_paperwork text,
        customer_contact_phone text, customer_contact_email text,
        name text, logo_url text, logo_filename text, last_contact_date date,
        techs_on_site boolean NOT NULL DEFAULT false,
        shipping_name text, shipping_contact_name text, shipping_contact_phone text,
        customer_contact_name text,
        lifecycle_phase text NOT NULL DEFAULT 'pre_commissioning',
        warranty_start_date date, warranty_end_date date,
        extended_warranty_start date, extended_warranty_end date,
        site_status text NOT NULL DEFAULT 'normal',
        astea_site_id text
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text NOT NULL,
        password_hash text NOT NULL,
        display_name text,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        last_login timestamp with time zone
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.contractors (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name text NOT NULL, contact_name text, email text, phone text,
        region text, notes text, is_active boolean DEFAULT true,
        created_at timestamp without time zone DEFAULT now(),
        updated_at timestamp without time zone DEFAULT now(), title text
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.employees (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL, phone text, email text, location text,
        is_active boolean DEFAULT true,
        created_at timestamp without time zone DEFAULT now(),
        updated_at timestamp without time zone DEFAULT now(), title text
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.parts_catalog (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        part_number text NOT NULL, description text, unit_of_measure text,
        has_serial_number boolean DEFAULT false, notes text,
        created_at timestamp without time zone DEFAULT now(),
        updated_at timestamp without time zone DEFAULT now()
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.units (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        site_id uuid, unit_type text NOT NULL, manufacturer text, model text,
        serial_number text NOT NULL, location_in_site text,
        status text DEFAULT 'active', install_date date, warranty_end_date date,
        created_at timestamp without time zone DEFAULT now(),
        updated_at timestamp without time zone DEFAULT now(),
        job_number text, line_number integer, warranty_start_date date,
        commission_level text DEFAULT 'none', description text, notes text,
        asset_tag text, system_id uuid,
        operational_status text NOT NULL DEFAULT 'operational',
        rfe_job_number text, rfe_wo_number text, rfe_date date, rfe_description text
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.service_tickets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        site_id uuid, title text NOT NULL, description text,
        status text NOT NULL DEFAULT 'open', c2_number text,
        parts_ordered jsonb NOT NULL DEFAULT '[]',
        service_lines jsonb NOT NULL DEFAULT '[]',
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now(),
        serial_number text, ticket_type text, open_date timestamp with time zone,
        priority_num integer, site_company_id text, scope_of_work text
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.issues (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        unit_id uuid, site_id uuid, title text NOT NULL, description text,
        status text DEFAULT 'open', priority text DEFAULT 'medium',
        reported_date timestamp without time zone DEFAULT now(),
        reported_by text, assigned_tech_id uuid, resolution_notes text,
        closed_date timestamp without time zone,
        created_at timestamp without time zone DEFAULT now(),
        updated_at timestamp without time zone DEFAULT now(),
        astea_request_id text, ticket_line_number integer DEFAULT 1,
        ticket_type text DEFAULT 'complaint',
        reported_by_type text DEFAULT 'technician',
        parts_ordered boolean DEFAULT false, tech_dispatched boolean DEFAULT false,
        resolution text, resolved_at timestamp without time zone,
        unit_tag text, unit_serial_number text, parts_items jsonb, scope text,
        num_techs integer, service_start_date date, service_end_date date,
        cxalloy_issue_id text, cx_zone text, cx_issue_type text, cx_source text,
        service_ticket_id uuid
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.work_orders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        issue_id uuid, site_id uuid, unit_id uuid, work_type text NOT NULL,
        scheduled_start_date date, scheduled_end_date date,
        actual_start_date date, actual_end_date date,
        status text DEFAULT 'scheduled', description text,
        created_at timestamp without time zone DEFAULT now(),
        updated_at timestamp without time zone DEFAULT now()
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.technicians (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL UNIQUE, location_city text, location_state text,
        latitude double precision, longitude double precision,
        is_active boolean NOT NULL DEFAULT true, notes text,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.job_schedule (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        site_id uuid, pm_id uuid, job_name text NOT NULL,
        job_type text NOT NULL DEFAULT 'Warranty', contract_number text,
        priority integer NOT NULL DEFAULT 3, start_date date, end_date date,
        status text NOT NULL DEFAULT 'scheduled', notes text,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.job_schedule_techs (
        job_id uuid NOT NULL, technician_id uuid NOT NULL,
        PRIMARY KEY (job_id, technician_id)
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.msow_drafts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        site_id uuid, name text NOT NULL DEFAULT 'Untitled MSOW',
        form_data jsonb NOT NULL DEFAULT '{}',
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.commissioning_projects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        site_id uuid, project_name text, start_date date, expected_end_date date,
        current_milestone text DEFAULT 'L1',
        l1_date date, l2_date date, l3_date date, l4_date date, l5_date date,
        notes text,
        created_at timestamp without time zone DEFAULT now(),
        updated_at timestamp without time zone DEFAULT now(),
        unit_id uuid, l1_completed_by text, l2_completed_by text,
        l3_completed_by text, l4_completed_by text, l5_completed_by text,
        l1_checklist_url text, l2_checklist_url text, l3_checklist_url text,
        l4_checklist_url text, l5_checklist_url text,
        l1_checklist_filename text, l2_checklist_filename text,
        l3_checklist_filename text, l4_checklist_filename text, l5_checklist_filename text,
        l1_completed boolean NOT NULL DEFAULT false,
        l2_completed boolean NOT NULL DEFAULT false,
        l3_completed boolean NOT NULL DEFAULT false,
        l4_completed boolean NOT NULL DEFAULT false,
        l5_completed boolean NOT NULL DEFAULT false
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.unit_components (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        unit_id uuid NOT NULL, name text NOT NULL, model text,
        serial_number text, installed_date date, notes text,
        created_at timestamp with time zone NOT NULL DEFAULT now()
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.component_updates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        component_id uuid NOT NULL, description text NOT NULL,
        performed_by text, date date,
        created_at timestamp with time zone NOT NULL DEFAULT now()
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.bom_imports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        site_id uuid, unit_id uuid, assembly_number text, bom_description text,
        imported_at timestamp without time zone DEFAULT now(),
        source_filename text, raw_text text
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.bom_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        bom_import_id uuid, part_catalog_id uuid, quantity numeric,
        unit_of_measure text, component text NOT NULL, rev text,
        description text, sort_order integer DEFAULT 0
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.contractor_assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        contractor_id uuid, issue_id uuid, work_order_id uuid, site_id uuid,
        role text, notes text, assigned_at timestamp without time zone DEFAULT now()
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.contractor_specialties (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        contractor_id uuid, specialty text NOT NULL
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.employee_site_assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id uuid, site_id uuid,
        created_at timestamp without time zone DEFAULT now()
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.equipment_history (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        unit_id uuid NOT NULL, site_id uuid NOT NULL,
        event_type text NOT NULL, title text NOT NULL, description text,
        component_name text, old_component_serial text, new_component_serial text,
        part_number text, performed_by uuid, work_order_id uuid,
        hours_worked numeric(5,2), cost numeric(10,2),
        photo_urls text[], document_urls text[], event_date date NOT NULL,
        created_by text, created_at timestamp without time zone DEFAULT now()
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.material_history (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        unit_id uuid NOT NULL, part_number character varying(255),
        description text NOT NULL, quantity integer NOT NULL DEFAULT 1,
        date date, notes text,
        created_at timestamp with time zone NOT NULL DEFAULT now()
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.notes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        site_id uuid, unit_id uuid, content text NOT NULL,
        author character varying(255),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        note_type text NOT NULL DEFAULT 'note'
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.part_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        work_order_id uuid, site_id uuid, unit_id uuid,
        part_description text NOT NULL, manufacturer text,
        model_number text, part_number text, quantity integer DEFAULT 1,
        photo_url text, shipping_address text,
        requested_date timestamp without time zone DEFAULT now(),
        requested_by text, status text DEFAULT 'requested',
        approval_date timestamp without time zone, approved_by text,
        estimated_arrival date, actual_arrival date, cost numeric(10,2),
        notes text, created_at timestamp without time zone DEFAULT now(),
        updated_at timestamp without time zone DEFAULT now()
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.pm_schedules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        unit_id uuid, site_id uuid, frequency_months integer DEFAULT 12,
        last_pm_date date, next_pm_date date, contractor_id uuid, issue_id uuid,
        notes text, status text DEFAULT 'scheduled',
        created_at timestamp without time zone DEFAULT now(),
        updated_at timestamp without time zone DEFAULT now()
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.site_address_history (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        site_id uuid NOT NULL, old_address text, old_city text,
        old_state text, old_zip_code text, new_address text, new_city text,
        new_state text, new_zip_code text, changed_by text, reason text,
        changed_at timestamp without time zone DEFAULT now()
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.site_campaigns (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        site_id uuid NOT NULL, name text NOT NULL, campaign_type text NOT NULL,
        description text, started_at date, completed_at date,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(), unit_ids jsonb
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.site_contacts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        site_id uuid NOT NULL, name text NOT NULL, role text, phone text,
        email text, notes text, sort_order integer DEFAULT 0,
        created_at timestamp without time zone DEFAULT now(),
        updated_at timestamp without time zone DEFAULT now(),
        contact_type text NOT NULL DEFAULT 'site_contact'
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.site_documents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        site_id uuid NOT NULL, doc_type text NOT NULL, name text NOT NULL,
        original_filename text, url text NOT NULL, file_size bigint,
        description text, uploaded_at timestamp without time zone DEFAULT now()
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.site_form_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        site_id uuid NOT NULL, name text NOT NULL, description text,
        category text DEFAULT 'general', url text, filename text,
        created_at timestamp without time zone DEFAULT now(),
        updated_at timestamp without time zone DEFAULT now()
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.site_job_numbers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        site_id uuid NOT NULL, job_number text NOT NULL, description text,
        is_primary boolean DEFAULT false,
        created_at timestamp without time zone DEFAULT now()
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.site_notes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        site_id uuid NOT NULL, note text NOT NULL, created_by text,
        created_at timestamp without time zone DEFAULT now(),
        unit_tag text, note_type text DEFAULT 'general', file_url text, file_name text
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.sycool_systems (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        site_id uuid NOT NULL, data_hall text NOT NULL, system_number text NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.tasks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title text NOT NULL, description text, priority text DEFAULT 'medium',
        status text DEFAULT 'open', site_id uuid, unit_id uuid, issue_id uuid,
        work_order_id uuid, site_note_id uuid, assigned_to uuid, due_date date,
        completed_date timestamp without time zone, created_by text,
        created_at timestamp without time zone DEFAULT now(),
        updated_at timestamp without time zone DEFAULT now()
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.technician_schedules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id uuid NOT NULL, site_id uuid NOT NULL,
        schedule_date date NOT NULL, time_slot text NOT NULL,
        work_type text, notes text,
        created_at timestamp without time zone DEFAULT now()
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.todos (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title text NOT NULL, description text, site_id uuid,
        status text NOT NULL DEFAULT 'todo', priority text NOT NULL DEFAULT 'normal',
        due_date date, created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.unit_campaign_status (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id uuid NOT NULL, unit_id uuid NOT NULL,
        completed boolean NOT NULL DEFAULT false,
        completed_at timestamp with time zone, completed_by text, notes text,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.unit_parts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        unit_id uuid, part_catalog_id uuid, part_number text, description text,
        serial_number text, quantity numeric DEFAULT 1, installed_date date,
        work_order_id uuid, notes text,
        created_at timestamp without time zone DEFAULT now()
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.unit_programs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        unit_id uuid NOT NULL, controller_name text NOT NULL,
        program_name text NOT NULL, version text, install_date date, notes text,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now()
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.warranty_claims (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        unit_id uuid, site_id uuid, issue_id uuid, astea_request_id text,
        claim_date date DEFAULT CURRENT_DATE, description text NOT NULL,
        status text DEFAULT 'submitted', resolution text, closed_date date,
        created_at timestamp without time zone DEFAULT now(),
        updated_at timestamp without time zone DEFAULT now()
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.work_order_assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        work_order_id uuid, employee_id uuid,
        created_at timestamp without time zone DEFAULT now()
    )").execute(pool).await?;

    sqlx::query("CREATE TABLE IF NOT EXISTS public.issue_line_links (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        issue_id uuid NOT NULL, service_ticket_id uuid NOT NULL,
        order_id text NOT NULL,
        created_at timestamp with time zone NOT NULL DEFAULT now()
    )").execute(pool).await?;

    // Incremental schema changes
    sqlx::query("ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS astea_site_id TEXT").execute(pool).await?;
    sqlx::query("ALTER TABLE public.service_tickets ADD COLUMN IF NOT EXISTS scope_of_work TEXT").execute(pool).await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_issue_line_links_issue ON public.issue_line_links(issue_id)").execute(pool).await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_issue_line_links_ticket ON public.issue_line_links(service_ticket_id)").execute(pool).await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_issue_line_links_order ON public.issue_line_links(order_id)").execute(pool).await?;
    sqlx::query("CREATE UNIQUE INDEX IF NOT EXISTS idx_issue_line_links_unique ON public.issue_line_links(issue_id, order_id)").execute(pool).await?;
    sqlx::query("ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS cxalloy_url TEXT").execute(pool).await?;

    tracing::info!("Migrations applied");
    Ok(())
}
