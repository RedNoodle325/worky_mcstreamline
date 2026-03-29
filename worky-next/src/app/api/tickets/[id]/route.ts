import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request)
  if (error) return error

  const { id } = await params

  const rows = await sql`SELECT * FROM public.issues WHERE id = ${id}`
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(rows[0])
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request)
  if (error) return error

  const { id } = await params
  const body = await request.json()

  const rows = await sql`
    UPDATE public.issues SET
      astea_request_id   = COALESCE(${body.astea_request_id ?? null}, astea_request_id),
      status             = COALESCE(${body.status ?? null}, status),
      parts_ordered      = COALESCE(${body.parts_ordered ?? null}, parts_ordered),
      tech_dispatched    = COALESCE(${body.tech_dispatched ?? null}, tech_dispatched),
      resolution         = COALESCE(${body.resolution ?? null}, resolution),
      title              = COALESCE(${body.title ?? null}, title),
      description        = COALESCE(${body.description ?? null}, description),
      unit_tag           = COALESCE(${body.unit_tag ?? null}, unit_tag),
      unit_serial_number = COALESCE(${body.unit_serial_number ?? null}, unit_serial_number),
      parts_items        = COALESCE(${body.parts_items ?? null}, parts_items),
      scope              = COALESCE(${body.scope ?? null}, scope),
      num_techs          = COALESCE(${body.num_techs ?? null}, num_techs),
      service_start_date = COALESCE(${body.service_start_date ?? null}, service_start_date),
      service_end_date   = COALESCE(${body.service_end_date ?? null}, service_end_date),
      updated_at         = now(),
      resolved_at        = CASE
        WHEN ${body.status ?? null}::TEXT = 'resolved' AND resolved_at IS NULL THEN now()
        ELSE resolved_at
      END
    WHERE id = ${id}
    RETURNING *
  `
  if (rows.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(rows[0])
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request)
  if (error) return error

  const { id } = await params

  await sql`DELETE FROM public.issues WHERE id = ${id}`
  return new NextResponse(null, { status: 204 })
}
