import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id } = await params

  const rows = await sql`
    SELECT
      id, site_id, unit_id, ticket_type, title, description, status, priority,
      unit_tag, reported_by, resolution_notes, reported_date, closed_date,
      cxalloy_issue_id, cxalloy_url, cx_zone, cx_issue_type, cx_source,
      service_ticket_id, created_at, updated_at
    FROM public.issues
    WHERE site_id = ${id}
    ORDER BY reported_date DESC NULLS LAST, created_at DESC
  `
  return NextResponse.json(rows)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const {
    unit_id,
    title,
    description,
    unit_tag,
    priority,
    status,
    reported_by,
    resolution_notes,
    cx_zone,
    cx_issue_type,
    cx_source,
    cxalloy_url,
    reported_date,
    closed_date,
    ticket_type,
    service_ticket_id,
  } = body

  const rows = await sql`
    INSERT INTO public.issues (
      site_id, unit_id, title, description, unit_tag, priority, status,
      reported_by, resolution_notes, cx_zone, cx_issue_type, cx_source,
      cxalloy_url, reported_date, closed_date, ticket_type, service_ticket_id
    )
    VALUES (
      ${id},
      ${unit_id ?? null},
      ${title ?? null},
      ${description ?? null},
      ${unit_tag ?? null},
      ${priority ?? null},
      ${status ?? null},
      ${reported_by ?? null},
      ${resolution_notes ?? null},
      ${cx_zone ?? null},
      ${cx_issue_type ?? null},
      ${cx_source ?? null},
      ${cxalloy_url ?? null},
      ${reported_date ?? null},
      ${closed_date ?? null},
      ${ticket_type ?? null},
      ${service_ticket_id ?? null}
    )
    RETURNING
      id, site_id, unit_id, ticket_type, title, description, status, priority,
      unit_tag, reported_by, resolution_notes, reported_date, closed_date,
      cxalloy_issue_id, cxalloy_url, cx_zone, cx_issue_type, cx_source,
      service_ticket_id, created_at, updated_at
  `
  return NextResponse.json(rows[0], { status: 201 })
}
