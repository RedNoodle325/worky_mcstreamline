import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; componentId: string; updateId: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { updateId } = await params
  const body = await req.json()
  const date = body.date ?? null

  const [row] = await sql`
    UPDATE public.component_updates SET
      description = COALESCE(${body.description ?? null}, description),
      performed_by = COALESCE(${body.performed_by ?? null}, performed_by),
      date = COALESCE(${date}::DATE, date)
    WHERE id = ${updateId}
    RETURNING id, component_id, description, performed_by, date, created_at
  `
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; componentId: string; updateId: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { updateId } = await params

  await sql`DELETE FROM public.component_updates WHERE id = ${updateId}`
  return new NextResponse(null, { status: 204 })
}
