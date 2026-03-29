import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth(req)
  if (error) return error

  const { id } = await params
  const body = await req.json()

  const [unit] = await sql`
    UPDATE public.units
    SET operational_status = ${body.operational_status}, updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `

  if (!unit) {
    return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
  }

  return NextResponse.json(unit)
}
