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
  const { title, description, status, priority, due_date } = body
  const setSiteId = body.site_id !== undefined

  const rows = await sql`
    UPDATE public.todos
    SET
      title       = COALESCE(${title ?? null}, title),
      description = COALESCE(${description ?? null}, description),
      site_id     = CASE WHEN ${setSiteId}::BOOLEAN THEN ${body.site_id ?? null} ELSE site_id END,
      status      = COALESCE(${status ?? null}, status),
      priority    = COALESCE(${priority ?? null}, priority),
      due_date    = COALESCE(${due_date ?? null}, due_date),
      updated_at  = NOW()
    WHERE id = ${id}
    RETURNING *
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
    DELETE FROM public.todos
    WHERE id = ${id}
  `
  return new NextResponse(null, { status: 204 })
}
