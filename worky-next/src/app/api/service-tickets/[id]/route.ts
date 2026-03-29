import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request)
  if (error) return error

  const { id } = await params

  const rows = await sql`
    SELECT id, site_id, title, description, status, c2_number, parts_ordered, service_lines,
           serial_number, ticket_type, open_date, priority_num, site_company_id, scope_of_work,
           created_at, updated_at
    FROM public.service_tickets
    WHERE id = ${id}
  `
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
    UPDATE public.service_tickets SET
      title         = COALESCE(${body.title ?? null}, title),
      description   = COALESCE(${body.description ?? null}, description),
      status        = COALESCE(${body.status ?? null}, status),
      c2_number     = COALESCE(${body.c2_number ?? null}, c2_number),
      parts_ordered = COALESCE(${body.parts_ordered ?? null}, parts_ordered),
      service_lines = COALESCE(${body.service_lines ?? null}, service_lines),
      scope_of_work = COALESCE(${body.scope_of_work ?? null}, scope_of_work),
      updated_at    = now()
    WHERE id = ${id}
    RETURNING id, site_id, title, description, status, c2_number, parts_ordered, service_lines,
              serial_number, ticket_type, open_date, priority_num, site_company_id, scope_of_work,
              created_at, updated_at
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

  await sql`DELETE FROM public.service_tickets WHERE id = ${id}`
  return new NextResponse(null, { status: 204 })
}
