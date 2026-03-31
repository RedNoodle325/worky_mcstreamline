import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth(request)
  if (error) return error

  const { id } = await params
  const body = await request.json()

  const rows = await sql`
    UPDATE public.resource_links SET
      name        = COALESCE(${body.name?.trim()        ?? null}, name),
      url         = COALESCE(${body.url?.trim()         ?? null}, url),
      category    = COALESCE(${body.category?.trim()    ?? null}, category),
      description = COALESCE(${body.description?.trim() ?? null}, description),
      sort_order  = COALESCE(${body.sort_order          ?? null}, sort_order),
      updated_at  = now()
    WHERE id = ${id}
    RETURNING *
  `
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAuth(request)
  if (error) return error

  const { id } = await params
  await sql`DELETE FROM public.resource_links WHERE id = ${id}`
  return new NextResponse(null, { status: 204 })
}
