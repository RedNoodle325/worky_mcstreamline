import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const siteId = req.nextUrl.searchParams.get('site_id') ?? null

  const rows = await sql`
    SELECT d.* FROM public.msow_drafts d
    WHERE (${siteId}::UUID IS NULL OR d.site_id = ${siteId})
    ORDER BY d.updated_at DESC
  `
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const body = await req.json()

  if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const [row] = await sql`
    INSERT INTO public.msow_drafts (site_id, name, form_data)
    VALUES (${body.site_id ?? null}, ${body.name}, ${body.form_data}::JSONB)
    RETURNING *
  `
  return NextResponse.json(row, { status: 201 })
}
