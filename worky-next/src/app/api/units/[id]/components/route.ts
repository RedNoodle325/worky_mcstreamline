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
    SELECT id, unit_id, name, model, serial_number, installed_date, notes, created_at
    FROM public.unit_components
    WHERE unit_id = ${id}
    ORDER BY created_at ASC
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
  const { name, model, serial_number, installed_date, notes } = body

  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const serial = serial_number ?? null
  const date = installed_date ?? null

  const [row] = await sql`
    INSERT INTO public.unit_components
      (unit_id, name, model, serial_number, installed_date, notes)
    VALUES
      (${id}, ${name}, ${model ?? null}, ${serial}, ${date}::DATE, ${notes ?? null})
    RETURNING id, unit_id, name, model, serial_number, installed_date, notes, created_at
  `
  return NextResponse.json(row, { status: 201 })
}
