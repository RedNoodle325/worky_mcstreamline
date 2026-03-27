// ── Core Models ───────────────────────────────────────────────────────────────

export interface Site {
  id: string
  name: string
  project_name?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  country?: string
  region?: string
  status?: string
  warranty_status?: string
  site_type?: string
  owner?: string
  shipping_name?: string
  shipping_contact?: string
  job_number?: string
  astea_site_id?: string
  logo_url?: string
  created_at?: string
  updated_at?: string
}

export interface Unit {
  id: string
  site_id: string
  tag: string
  serial_number?: string
  model?: string
  manufacturer?: string
  unit_type?: string
  capacity_kw?: number
  location?: string
  floor?: string
  status?: string
  operational_status?: string
  install_date?: string
  warranty_expiry?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface Contact {
  id: string
  site_id: string
  name: string
  email?: string
  phone?: string
  title?: string
  contact_type?: string
  is_primary?: boolean
  created_at?: string
}

export interface Contractor {
  id: string
  name: string
  company?: string
  email?: string
  phone?: string
  specialty?: string
  notes?: string
  created_at?: string
}

export interface Note {
  id: string
  site_id?: string
  unit_id?: string
  content: string
  note_type?: string
  author_name?: string
  created_by_name?: string
  created_at?: string
  updated_at?: string
}

export interface Issue {
  id: string
  site_id?: string
  unit_id?: string
  title?: string
  description?: string
  status?: string
  priority?: string
  unit_tag?: string
  ticket_type?: string
  reported_by?: string
  resolution_notes?: string
  reported_date?: string
  closed_date?: string
  cxalloy_issue_id?: string
  cx_zone?: string
  cx_issue_type?: string
  cx_source?: string
  service_ticket_id?: string
  created_at?: string
  updated_at?: string
}

export interface ServiceTicket {
  id: string
  site_id?: string
  title: string
  description?: string
  status: string
  c2_number?: string
  parts_ordered: PartOrdered[]
  service_lines: ServiceLine[]
  serial_number?: string
  ticket_type?: string
  open_date?: string
  priority_num?: number
  site_company_id?: string
  scope_of_work?: string
  created_at?: string
  updated_at?: string
}

export interface ServiceLine {
  order_id?: string
  line_no?: number
  astea_id?: string
  description?: string
  part_number?: string
  serial_number?: string
  tag?: string
  status?: string
  technician?: string
  activity_group?: string
  problem_desc?: string
  order_type?: string
  caller_name?: string
  company_descr?: string
}

export interface PartOrdered {
  description?: string
  qty?: number
  so_number?: string
}

export interface IssueLineLink {
  id: string
  issue_id: string
  service_ticket_id: string
  order_id: string
  created_at?: string
}

export interface Ticket {
  id: string
  site_id?: string
  unit_id?: string
  title: string
  description?: string
  status: string
  priority?: string
  ticket_type?: string
  unit_tag?: string
  reported_by?: string
  resolution?: string
  created_at?: string
  updated_at?: string
}

export interface Todo {
  id: string
  title: string
  description?: string
  status: string
  priority?: string
  due_date?: string
  site_id?: string
  assigned_to?: string
  created_at?: string
  updated_at?: string
}

export interface Schedule {
  id: string
  site_id?: string
  title: string
  description?: string
  start_date?: string
  end_date?: string
  status?: string
  technician_ids?: string[]
  created_at?: string
}

export interface Technician {
  id: string
  name: string
  email?: string
  phone?: string
  region?: string
  skills?: string[]
  active?: boolean
}

export interface MsowDraft {
  id: string
  site_id?: string
  name: string
  form_data: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export interface WarrantyClaim {
  id: string
  site_id?: string
  unit_id?: string
  claim_number?: string
  title: string
  description?: string
  status: string
  submitted_date?: string
  resolved_date?: string
  created_at?: string
}

export interface BomImport {
  id: string
  site_id?: string
  filename: string
  imported_at?: string
  row_count?: number
}

export interface BomItem {
  id: string
  bom_id: string
  part_number?: string
  description?: string
  quantity?: number
  unit?: string
  unit_price?: number
}

export interface Campaign {
  id: string
  site_id: string
  name: string
  description?: string
  status?: string
  created_at?: string
}

export interface SycoolSystem {
  id: string
  site_id: string
  name: string
  system_type?: string
  status?: string
  notes?: string
}

export interface User {
  id: string
  email: string
  name?: string
  role?: string
}

export interface JobNumber {
  id: string
  site_id: string
  job_number: string
  description?: string
  created_at?: string
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  email: string
  name?: string
  role?: string
}

export interface LoginResponse {
  token: string
  email: string
  display_name?: string
}

// ── API response shapes ───────────────────────────────────────────────────────

export interface ImportResult {
  created: number
  updated: number
  skipped: number
  errors: string[]
}
