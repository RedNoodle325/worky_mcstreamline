import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function PUT(
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
    status,
    priority,
    unit_tag,
    resolution_notes,
    closed_date,
    cx_zone,
    cx_issue_type,
    service_ticket_id,
    cxalloy_url,
  } = body

  const rows = await sql`
    UPDATE public.issues
    SET
      unit_id           = COALESCE(${unit_id ?? null}, unit_id),
      title             = COALESCE(${title ?? null}, title),
      description       = COALESCE(${description ?? null}, description),
      status            = COALESCE(${status ?? null}, status),
      priority          = COALESCE(${priority ?? null}, priority),
      unit_tag          = COALESCE(${unit_tag ?? null}, unit_tag),
      resolution_notes  = COALESCE(${resolution_notes ?? null}, resolution_notes),
      closed_date       = COALESCE(${closed_date ?? null}, closed_date),
      cx_zone           = COALESCE(${cx_zone ?? null}, cx_zone),
      cx_issue_type     = COALESCE(${cx_issue_type ?? null}, cx_issue_type),
      service_ticket_id = COALESCE(${service_ticket_id ?? null}, service_ticket_id),
      cxalloy_url       = COALESCE(${cxalloy_url ?? null}, cxalloy_url),
      updated_at        = now()
    WHERE id = ${id}
    RETURNING
      id, site_id, unit_id, ticket_type, title, description, status, priority,
      unit_tag, reported_by, resolution_notes, reported_date, closed_date,
      cxalloy_issue_id, cxalloy_url, cx_zone, cx_issue_type, cx_source,
      service_ticket_id, created_at, updated_at
  `
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id } = await params

  await sql`
    DELETE FROM public.issues
    WHERE id = ${id}
  `
  return new NextResponse(null, { status: 204 })
}
