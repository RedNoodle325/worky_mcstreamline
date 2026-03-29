import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request)
  if (error) return error

  const { id } = await params

  const rows = await sql`SELECT * FROM public.warranty_claims WHERE id = ${id}`
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
    UPDATE public.warranty_claims SET
      status           = COALESCE(${body.status ?? null}, status),
      resolution       = COALESCE(${body.resolution ?? null}, resolution),
      closed_date      = COALESCE(${body.closed_date ?? null}, closed_date),
      astea_request_id = COALESCE(${body.astea_request_id ?? null}, astea_request_id),
      updated_at       = now()
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

  await sql`DELETE FROM public.warranty_claims WHERE id = ${id}`
  return new NextResponse(null, { status: 204 })
}
