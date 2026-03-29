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
    WHERE site_id = ${id} AND unit_id IS NULL
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
  const { note_type, content, author, unit_id } = body

  const rows = await sql`
    INSERT INTO public.notes (site_id, unit_id, note_type, content, author)
    VALUES (${id}, ${unit_id ?? null}, ${note_type ?? null}, ${content ?? null}, ${author ?? null})
    RETURNING id, site_id, unit_id, note_type, content, author, created_at, updated_at
  `

  await sql`
    UPDATE public.sites
    SET last_contact_date = NOW()
    WHERE id = ${id}
  `

  return NextResponse.json(rows[0], { status: 201 })
}
