import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth(req)
  if (error) return error

  const { id } = await params

  const rows = await sql`SELECT * FROM public.sites WHERE id = ${id}`
  if (!rows[0]) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  }

  return NextResponse.json(rows[0])
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth(req)
  if (error) return error

  const { id } = await params
  const body = await req.json()

  const [site] = await sql`
    UPDATE public.sites SET
      project_number           = COALESCE(${body.project_number ?? null}, project_number),
      project_name             = COALESCE(${body.project_name ?? null}, project_name),
      customer_name            = COALESCE(${body.customer_name ?? null}, customer_name),
      name                     = COALESCE(${body.name ?? null}, name),
      address                  = COALESCE(${body.address ?? null}, address),
      city                     = COALESCE(${body.city ?? null}, city),
      state                    = COALESCE(${body.state ?? null}, state),
      zip_code                 = COALESCE(${body.zip_code ?? null}, zip_code),
      point_of_contact         = COALESCE(${body.point_of_contact ?? null}, point_of_contact),
      poc_phone                = COALESCE(${body.poc_phone ?? null}, poc_phone),
      poc_email                = COALESCE(${body.poc_email ?? null}, poc_email),
      customer_contact_name    = COALESCE(${body.customer_contact_name ?? null}, customer_contact_name),
      customer_contact_phone   = COALESCE(${body.customer_contact_phone ?? null}, customer_contact_phone),
      customer_contact_email   = COALESCE(${body.customer_contact_email ?? null}, customer_contact_email),
      shipping_name            = COALESCE(${body.shipping_name ?? null}, shipping_name),
      shipping_contact_name    = COALESCE(${body.shipping_contact_name ?? null}, shipping_contact_name),
      shipping_contact_phone   = COALESCE(${body.shipping_contact_phone ?? null}, shipping_contact_phone),
      shipping_address_street  = COALESCE(${body.shipping_address_street ?? null}, shipping_address_street),
      shipping_address_city    = COALESCE(${body.shipping_address_city ?? null}, shipping_address_city),
      shipping_address_state   = COALESCE(${body.shipping_address_state ?? null}, shipping_address_state),
      shipping_address_zip     = COALESCE(${body.shipping_address_zip ?? null}, shipping_address_zip),
      access_requirements      = COALESCE(${body.access_requirements ?? null}, access_requirements),
      required_paperwork       = COALESCE(${body.required_paperwork ?? null}, required_paperwork),
      orientation_info         = COALESCE(${body.orientation_info ?? null}, orientation_info),
      notes                    = COALESCE(${body.notes ?? null}, notes),
      active                   = COALESCE(${body.active ?? null}, active),
      project_manager_id       = COALESCE(${body.project_manager_id ?? null}, project_manager_id),
      astea_site_id            = COALESCE(${body.astea_site_id ?? null}, astea_site_id),
      updated_at               = now()
    WHERE id = ${id}
    RETURNING *
  `

  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  }

  return NextResponse.json(site)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth(req)
  if (error) return error

  const { id } = await params

  await sql`DELETE FROM public.sites WHERE id = ${id}`

  return new NextResponse(null, { status: 204 })
}
