import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('site_id') ?? null
  const status = searchParams.get('status') ?? null

  const rows = await sql`
    SELECT t.*, COALESCE(s.project_name, '') as _site_name
    FROM public.todos t
    LEFT JOIN public.sites s ON s.id = t.site_id
    WHERE (${siteId ?? null}::UUID IS NULL OR t.site_id = ${siteId ?? null})
      AND (${status ?? null}::TEXT IS NULL OR t.status = ${status ?? null})
    ORDER BY
      CASE t.status WHEN 'done' THEN 1 ELSE 0 END,
      CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 WHEN 'low' THEN 3 ELSE 4 END,
      t.due_date ASC NULLS LAST, t.created_at DESC
  `
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const body = await req.json()
  const { title, description, site_id, priority, due_date } = body

  const rows = await sql`
    INSERT INTO public.todos (title, description, site_id, priority, due_date)
    VALUES (
      ${title ?? null},
      ${description ?? null},
      ${site_id ?? null},
      ${priority ?? null},
      ${due_date ?? null}
    )
    RETURNING *
  `
  return NextResponse.json(rows[0], { status: 201 })
}
