import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id, programId } = await params
  const body = await req.json()

  const [row] = await sql`
    UPDATE public.unit_programs SET
      controller_name = COALESCE(${body.controller_name ?? null}, controller_name),
      program_name = COALESCE(${body.program_name ?? null}, program_name),
      version = COALESCE(${body.version ?? null}, version),
      install_date = COALESCE(${body.install_date ?? null}, install_date),
      notes = COALESCE(${body.notes ?? null}, notes),
      updated_at = now()
    WHERE id = ${programId} AND unit_id = ${id}
    RETURNING *
  `
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; programId: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id, programId } = await params

  await sql`DELETE FROM public.unit_programs WHERE id = ${programId} AND unit_id = ${id}`
  return new NextResponse(null, { status: 204 })
}
