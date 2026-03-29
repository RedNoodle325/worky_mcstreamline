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
    SELECT * FROM public.unit_programs
    WHERE unit_id = ${id}
    ORDER BY controller_name, install_date DESC
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
  const { controller_name, program_name, version, install_date, notes } = body

  if (!controller_name) return NextResponse.json({ error: 'controller_name required' }, { status: 400 })

  const [row] = await sql`
    INSERT INTO public.unit_programs
      (unit_id, controller_name, program_name, version, install_date, notes)
    VALUES
      (${id}, ${controller_name}, ${program_name ?? null}, ${version ?? null}, ${install_date ?? null}, ${notes ?? null})
    RETURNING *
  `
  return NextResponse.json(row, { status: 201 })
}
