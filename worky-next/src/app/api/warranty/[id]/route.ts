import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request)
  if (error) return error

  const { id } = await params
  const rows = await sql`SELECT * FROM public.warranty_claims WHERE id = ${id}`
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request)
  if (error) return error

  const { id } = await params
  const body = await request.json()

  const rows = await sql`
    UPDATE public.warranty_claims SET
      title               = COALESCE(${body.title            ?? null}, title),
      claim_number        = COALESCE(${body.claim_number     ?? null}, claim_number),
      description         = COALESCE(${body.description      ?? null}, description),
      site_id             = COALESCE(${body.site_id          ?? null}, site_id),
      unit_id             = COALESCE(${body.unit_id          ?? null}, unit_id),
      submitted_date      = COALESCE(${body.submitted_date   ?? null}, submitted_date),
      resolved_date       = COALESCE(${body.resolved_date    ?? null}, resolved_date),
      status              = COALESCE(${body.status           ?? null}, status),
      resolution          = COALESCE(${body.resolution       ?? null}, resolution),
      rga_number          = COALESCE(${body.rga_number       ?? null}, rga_number),
      c2_ticket_number    = COALESCE(${body.c2_ticket_number ?? null}, c2_ticket_number),
      parts_status        = COALESCE(${body.parts_status     ?? null}, parts_status),
      parts_notes         = COALESCE(${body.parts_notes      ?? null}, parts_notes),
      tech_dispatched     = COALESCE(${body.tech_dispatched  ?? null}, tech_dispatched),
      tech_dispatch_date  = COALESCE(${body.tech_dispatch_date ?? null}, tech_dispatch_date),
      updated_at          = now()
    WHERE id = ${id}
    RETURNING *
  `
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request)
  if (error) return error

  const { id } = await params
  await sql`DELETE FROM public.warranty_claims WHERE id = ${id}`
  return new NextResponse(null, { status: 204 })
}
