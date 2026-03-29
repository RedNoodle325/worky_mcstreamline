import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(request: NextRequest) {
  const { error } = await requireAuth(request)
  if (error) return error

  const { searchParams } = new URL(request.url)
  const siteId = searchParams.get('site_id') ?? null
  const unitId = searchParams.get('unit_id') ?? null
  const status = searchParams.get('status') ?? null

  const tickets = await sql`
    SELECT * FROM public.issues
    WHERE (${siteId}::UUID IS NULL OR site_id = ${siteId})
      AND (${unitId}::UUID IS NULL OR unit_id = ${unitId})
      AND (${status}::TEXT IS NULL OR status = ${status})
    ORDER BY created_at DESC
  `
  return NextResponse.json(tickets)
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth(request)
  if (error) return error

  const body = await request.json()
  const {
    site_id,
    unit_id,
    astea_request_id,
    ticket_line_number,
    ticket_type,
    reported_by_type,
    title,
    description,
    unit_tag,
    unit_serial_number,
    parts_items,
    scope,
    num_techs,
    service_start_date,
    service_end_date,
  } = body

  const rows = await sql`
    INSERT INTO public.issues
      (site_id, unit_id, astea_request_id, ticket_line_number, ticket_type, reported_by_type,
       title, description, status, unit_tag, unit_serial_number, parts_items, scope,
       num_techs, service_start_date, service_end_date)
    VALUES
      (${site_id ?? null}, ${unit_id ?? null}, ${astea_request_id ?? null},
       ${ticket_line_number ?? null}, ${ticket_type ?? null}, ${reported_by_type ?? null},
       ${title}, ${description ?? null}, 'open', ${unit_tag ?? null},
       ${unit_serial_number ?? null}, ${parts_items ?? null}, ${scope ?? null},
       ${num_techs ?? null}, ${service_start_date ?? null}, ${service_end_date ?? null})
    RETURNING *
  `
  return NextResponse.json(rows[0], { status: 201 })
}
