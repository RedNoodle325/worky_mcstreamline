import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

async function upsertUnitEntries(reportId: string, entries: Record<string, unknown>[]) {
  await sql`DELETE FROM public.daily_report_unit_entries WHERE report_id = ${reportId}`
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]
    await sql`
      INSERT INTO public.daily_report_unit_entries
        (report_id, unit_id, unit_tag, unit_serial, issue_description, resolution,
         parts_text, part_catalog_id, follow_up_required, photo_urls, sort_order)
      VALUES (
        ${reportId},
        ${(e.unit_id as string) ?? null},
        ${(e.unit_tag as string) ?? null},
        ${(e.unit_serial as string) ?? null},
        ${(e.issue_description as string) ?? null},
        ${(e.resolution as string) ?? null},
        ${(e.parts_text as string) ?? null},
        ${(e.part_catalog_id as string) ?? null},
        ${(e.follow_up_required as boolean) ?? false},
        ${(e.photo_urls as string[]) ?? []},
        ${i}
      )
    `
  }
}

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
    site_id, customer_complaint,
    site_delays, engineering_requests, notes,
    unit_entries,
  } = body

  const rows = await sql`
    UPDATE public.daily_tech_reports SET
      report_date          = COALESCE(${report_date ?? null}, report_date),
      technician_id        = CASE WHEN ${technician_id !== undefined}::BOOLEAN THEN ${technician_id ?? null} ELSE technician_id END,
      technician_name      = CASE WHEN ${technician_name !== undefined}::BOOLEAN THEN ${technician_name ?? null} ELSE technician_name END,
      site_id              = CASE WHEN ${site_id !== undefined}::BOOLEAN THEN ${site_id ?? null} ELSE site_id END,
      customer_complaint   = CASE WHEN ${customer_complaint !== undefined}::BOOLEAN THEN ${customer_complaint ?? null} ELSE customer_complaint END,
      site_delays          = CASE WHEN ${site_delays !== undefined}::BOOLEAN THEN ${site_delays ?? null} ELSE site_delays END,
      engineering_requests = CASE WHEN ${engineering_requests !== undefined}::BOOLEAN THEN ${engineering_requests ?? null} ELSE engineering_requests END,
      notes                = CASE WHEN ${notes !== undefined}::BOOLEAN THEN ${notes ?? null} ELSE notes END,
      updated_at           = NOW()
    WHERE id = ${id}
    RETURNING *
  `
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (Array.isArray(unit_entries)) {
    await upsertUnitEntries(id, unit_entries)
  }

  return NextResponse.json({ ...rows[0], unit_entries: unit_entries ?? [] })
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
