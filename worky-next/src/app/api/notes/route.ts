import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const body = await req.json()
  const { note_type, content, author } = body

  const rows = await sql`
    INSERT INTO public.notes (site_id, unit_id, note_type, content, author)
    VALUES (NULL, NULL, ${note_type ?? null}, ${content ?? null}, ${author ?? null})
    RETURNING id, site_id, unit_id, note_type, content, author, created_at, updated_at
  `
  return NextResponse.json(rows[0], { status: 201 })
}
