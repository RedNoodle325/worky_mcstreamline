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
  const { note_type, content, author } = body

  const rows = await sql`
    UPDATE public.notes
    SET
      note_type  = COALESCE(${note_type ?? null}, note_type),
      content    = COALESCE(${content ?? null}, content),
      author     = COALESCE(${author ?? null}, author),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, site_id, unit_id, note_type, content, author, created_at, updated_at
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
    DELETE FROM public.notes
    WHERE id = ${id}
  `
  return new NextResponse(null, { status: 204 })
}
