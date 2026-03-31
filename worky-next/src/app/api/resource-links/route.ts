import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(request: NextRequest) {
  const { error } = await requireAuth(request)
  if (error) return error

  const rows = await sql`
    SELECT * FROM public.resource_links ORDER BY sort_order ASC, created_at ASC
  `
  return NextResponse.json(rows)
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth(request)
  if (error) return error

  const body = await request.json()
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }

  const rows = await sql`
    INSERT INTO public.resource_links (name, url, category, description, sort_order)
    VALUES (
      ${body.name.trim()},
      ${body.url?.trim() ?? null},
      ${body.category?.trim() ?? 'general'},
      ${body.description?.trim() ?? null},
      ${body.sort_order ?? 0}
    )
    RETURNING *
  `
  return NextResponse.json(rows[0], { status: 201 })
}
