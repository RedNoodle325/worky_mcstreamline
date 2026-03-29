import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req)
  if (error) return error

  const sites = await sql`SELECT * FROM public.sites ORDER BY name ASC`

  return NextResponse.json(sites)
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth(req)
  if (error) return error

  const body = await req.json()

  const {
    project_number,
    project_name,
    customer_name,
    name,
    address,
    city,
    state,
    zip_code,
    point_of_contact,
    poc_phone,
    poc_email,
    customer_contact_name,
    customer_contact_phone,
    customer_contact_email,
    shipping_name,
    shipping_contact_name,
    shipping_contact_phone,
    shipping_address_street,
    shipping_address_city,
    shipping_address_state,
    shipping_address_zip,
    access_requirements,
    required_paperwork,
    orientation_info,
    notes,
    active = true,
    project_manager_id,
    astea_site_id,
    job_numbers,
  } = body

  const [site] = await sql`
    INSERT INTO public.sites (
      project_number,
      project_name,
      customer_name,
      name,
      address,
      city,
      state,
      zip_code,
      point_of_contact,
      poc_phone,
      poc_email,
      customer_contact_name,
      customer_contact_phone,
      customer_contact_email,
      shipping_name,
      shipping_contact_name,
      shipping_contact_phone,
      shipping_address_street,
      shipping_address_city,
      shipping_address_state,
      shipping_address_zip,
      access_requirements,
      required_paperwork,
      orientation_info,
      notes,
      active,
      project_manager_id,
      astea_site_id
    ) VALUES (
      ${project_number ?? null},
      ${project_name ?? null},
      ${customer_name ?? null},
      ${name},
      ${address ?? null},
      ${city ?? null},
      ${state ?? null},
      ${zip_code ?? null},
      ${point_of_contact ?? null},
      ${poc_phone ?? null},
      ${poc_email ?? null},
      ${customer_contact_name ?? null},
      ${customer_contact_phone ?? null},
      ${customer_contact_email ?? null},
      ${shipping_name ?? null},
      ${shipping_contact_name ?? null},
      ${shipping_contact_phone ?? null},
      ${shipping_address_street ?? null},
      ${shipping_address_city ?? null},
      ${shipping_address_state ?? null},
      ${shipping_address_zip ?? null},
      ${access_requirements ?? null},
      ${required_paperwork ?? null},
      ${orientation_info ?? null},
      ${notes ?? null},
      ${active},
      ${project_manager_id ?? null},
      ${astea_site_id ?? null}
    )
    RETURNING *
  `

  if (Array.isArray(job_numbers) && job_numbers.length > 0) {
    for (const jn of job_numbers) {
      await sql`
        INSERT INTO public.site_job_numbers (site_id, job_number, description, is_primary)
        VALUES (${site.id}, ${jn.job_number}, ${jn.description ?? null}, ${jn.is_primary ?? false})
      `
    }
  }

  return NextResponse.json(site, { status: 201 })
}
