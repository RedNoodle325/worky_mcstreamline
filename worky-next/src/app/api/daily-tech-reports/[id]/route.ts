import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const {
    report_date, technician_id, technician_name,
    site_id, units_worked, work_performed,
    site_delays, parts_needed, engineering_requests, notes,
  } = body

  const rows = await sql`
    UPDATE public.daily_tech_reports SET
      report_date          = COALESCE(${report_date ?? null}, report_date),
      technician_id        = CASE WHEN ${technician_id !== undefined}::BOOLEAN THEN ${technician_id ?? null} ELSE technician_id END,
      technician_name      = CASE WHEN ${technician_name !== undefined}::BOOLEAN THEN ${technician_name ?? null} ELSE technician_name END,
      site_id              = CASE WHEN ${site_id !== undefined}::BOOLEAN THEN ${site_id ?? null} ELSE site_id END,
      units_worked         = CASE WHEN ${units_worked !== undefined}::BOOLEAN THEN ${units_worked ?? null} ELSE units_worked END,
      work_performed       = CASE WHEN ${work_performed !== undefined}::BOOLEAN THEN ${work_performed ?? null} ELSE work_performed END,
      site_delays          = CASE WHEN ${site_delays !== undefined}::BOOLEAN THEN ${site_delays ?? null} ELSE site_delays END,
      parts_needed         = CASE WHEN ${parts_needed !== undefined}::BOOLEAN THEN ${parts_needed ?? null} ELSE parts_needed END,
      engineering_requests = CASE WHEN ${engineering_requests !== undefined}::BOOLEAN THEN ${engineering_requests ?? null} ELSE engineering_requests END,
      notes                = CASE WHEN ${notes !== undefined}::BOOLEAN THEN ${notes ?? null} ELSE notes END,
      updated_at           = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id } = await params

  await sql`DELETE FROM public.daily_tech_reports WHERE id = ${id}`
  return new NextResponse(null, { status: 204 })
}
