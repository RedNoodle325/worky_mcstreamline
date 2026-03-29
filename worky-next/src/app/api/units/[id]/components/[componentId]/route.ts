import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; componentId: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { componentId } = await params
  const body = await req.json()
  const date = body.installed_date ?? null

  const [row] = await sql`
    UPDATE public.unit_components SET
      name = COALESCE(${body.name ?? null}, name),
      model = COALESCE(${body.model ?? null}, model),
      serial_number = COALESCE(${body.serial_number ?? null}, serial_number),
      installed_date = COALESCE(${date}::DATE, installed_date),
      notes = COALESCE(${body.notes ?? null}, notes)
    WHERE id = ${componentId}
    RETURNING id, unit_id, name, model, serial_number, installed_date, notes, created_at
  `
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; componentId: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { componentId } = await params

  await sql`DELETE FROM public.unit_components WHERE id = ${componentId}`
  return new NextResponse(null, { status: 204 })
}
