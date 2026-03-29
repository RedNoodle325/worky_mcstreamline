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
    SELECT id, unit_id, part_number, description, quantity, date, notes, created_at
    FROM public.material_history
    WHERE unit_id = ${id}
    ORDER BY date DESC NULLS LAST, created_at DESC
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
  const pn = body.part_number ?? null
  const desc = body.description
  const qty = body.quantity ?? null
  const date = body.date ?? null
  const notes = body.notes ?? null

  if (!desc) return NextResponse.json({ error: 'description required' }, { status: 400 })

  const [row] = await sql`
    INSERT INTO public.material_history
      (unit_id, part_number, description, quantity, date, notes)
    VALUES
      (${id}, ${pn}, ${desc}, ${qty}, ${date}::DATE, ${notes})
    RETURNING id, unit_id, part_number, description, quantity, date, notes, created_at
  `
  return NextResponse.json(row, { status: 201 })
}
