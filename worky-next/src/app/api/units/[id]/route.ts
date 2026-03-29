import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth(req)
  if (error) return error

  const { id } = await params

  const rows = await sql`SELECT * FROM public.units WHERE id = ${id}`
  if (!rows[0]) {
    return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
  }

  return NextResponse.json(rows[0])
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth(req)
  if (error) return error

  const { id } = await params
  const body = await req.json()

  const [unit] = await sql`
    UPDATE public.units SET
      unit_type            = COALESCE(${body.unit_type ?? null}, unit_type),
      serial_number        = COALESCE(${body.serial_number ?? null}, serial_number),
      job_number           = COALESCE(${body.job_number ?? null}, job_number),
      line_number          = COALESCE(${body.line_number ?? null}, line_number),
      manufacturer         = COALESCE(${body.manufacturer ?? null}, manufacturer),
      model                = COALESCE(${body.model ?? null}, model),
      description          = COALESCE(${body.description ?? null}, description),
      location_in_site     = COALESCE(${body.location_in_site ?? null}, location_in_site),
      install_date         = COALESCE(${body.install_date ?? null}, install_date),
      warranty_start_date  = COALESCE(${body.warranty_start_date ?? null}, warranty_start_date),
      warranty_end_date    = COALESCE(${body.warranty_end_date ?? null}, warranty_end_date),
      notes                = COALESCE(${body.notes ?? null}, notes),
      rfe_date             = COALESCE(${body.rfe_date ?? null}, rfe_date),
      rfe_description      = COALESCE(${body.rfe_description ?? null}, rfe_description),
      updated_at           = now()
    WHERE id = ${id}
    RETURNING *
  `

  if (!unit) {
    return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
  }

  return NextResponse.json(unit)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth(req)
  if (error) return error

  const { id } = await params

  await sql`DELETE FROM public.units WHERE id = ${id}`

  return new NextResponse(null, { status: 204 })
}
