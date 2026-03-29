import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id, formId } = await params
  const body = await req.json()
  const { name, description, category, url } = body

  const rows = await sql`
    UPDATE public.site_form_templates
    SET
      name        = COALESCE(${name ?? null}, name),
      description = COALESCE(${description ?? null}, description),
      category    = COALESCE(${category ?? null}, category),
      url         = COALESCE(${url ?? null}, url),
      updated_at  = now()
    WHERE id = ${formId} AND site_id = ${id}
    RETURNING *
  `
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; formId: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id, formId } = await params

  await sql`
    DELETE FROM public.site_form_templates
    WHERE id = ${formId} AND site_id = ${id}
  `
  return new NextResponse(null, { status: 204 })
}
