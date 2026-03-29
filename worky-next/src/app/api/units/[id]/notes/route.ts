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
    SELECT id, site_id, unit_id, note_type, content, author, created_at, updated_at
    FROM public.notes
    WHERE unit_id = ${id}
    ORDER BY created_at DESC
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
  const { note_type, content, author } = body

  const units = await sql`
    SELECT site_id FROM public.units WHERE id = ${id}
  `
  if (!units.length) return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
  const unit = units[0]

  const rows = await sql`
    INSERT INTO public.notes (site_id, unit_id, note_type, content, author)
    VALUES (${unit.site_id}, ${id}, ${note_type ?? null}, ${content ?? null}, ${author ?? null})
    RETURNING id, site_id, unit_id, note_type, content, author, created_at, updated_at
  `
  return NextResponse.json(rows[0], { status: 201 })
}
