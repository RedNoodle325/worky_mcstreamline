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
    SELECT * FROM public.msow_drafts WHERE id = ${id}
  `
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const [row] = await sql`
    UPDATE public.msow_drafts SET
      name = COALESCE(${body.name ?? null}, name),
      form_data = COALESCE(${body.form_data ?? null}::JSONB, form_data),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id } = await params

  await sql`DELETE FROM public.msow_drafts WHERE id = ${id}`
  return new NextResponse(null, { status: 204 })
}
