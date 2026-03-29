import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; materialId: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { materialId } = await params
  const body = await req.json()
  const date = body.date ?? null

  const [row] = await sql`
    UPDATE public.material_history SET
      part_number = COALESCE(${body.part_number ?? null}, part_number),
      description = COALESCE(${body.description ?? null}, description),
      quantity = COALESCE(${body.quantity ?? null}, quantity),
      date = COALESCE(${date}::DATE, date),
      notes = COALESCE(${body.notes ?? null}, notes)
    WHERE id = ${materialId}
    RETURNING id, unit_id, part_number, description, quantity, date, notes, created_at
  `
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; materialId: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { materialId } = await params

  await sql`DELETE FROM public.material_history WHERE id = ${materialId}`
  return new NextResponse(null, { status: 204 })
}
