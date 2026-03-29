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
    SELECT * FROM public.site_form_templates
    WHERE site_id = ${id}
    ORDER BY category, name
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
  const { name, description, category, url } = body

  const rows = await sql`
    INSERT INTO public.site_form_templates (site_id, name, description, category, url)
    VALUES (${id}, ${name ?? null}, ${description ?? null}, ${category ?? null}, ${url ?? null})
    RETURNING *
  `
  return NextResponse.json(rows[0], { status: 201 })
}
