import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const techId = searchParams.get('technician_id') ?? null
  const siteId = searchParams.get('site_id') ?? null
  const dateFrom = searchParams.get('date_from') ?? null
  const dateTo = searchParams.get('date_to') ?? null

  const rows = await sql`
    SELECT
      r.*,
      COALESCE(s.project_name, s.name, '') AS _site_name,
      COALESCE(t.name, r.technician_name, '') AS _technician_name
    FROM public.daily_tech_reports r
    LEFT JOIN public.sites s ON s.id = r.site_id
    LEFT JOIN public.technicians t ON t.id = r.technician_id
    WHERE (${techId ?? null}::UUID IS NULL OR r.technician_id = ${techId ?? null})
      AND (${siteId ?? null}::UUID IS NULL OR r.site_id = ${siteId ?? null})
      AND (${dateFrom ?? null}::DATE IS NULL OR r.report_date >= ${dateFrom ?? null}::DATE)
      AND (${dateTo ?? null}::DATE IS NULL OR r.report_date <= ${dateTo ?? null}::DATE)
    ORDER BY r.report_date DESC, r.created_at DESC
  `
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const body = await req.json()
  const {
    report_date, technician_id, technician_name,
    site_id, units_worked, work_performed,
    site_delays, parts_needed, engineering_requests, notes,
  } = body

  const rows = await sql`
    INSERT INTO public.daily_tech_reports (
      report_date, technician_id, technician_name,
      site_id, units_worked, work_performed,
      site_delays, parts_needed, engineering_requests, notes
    ) VALUES (
      ${report_date ?? null},
      ${technician_id ?? null},
      ${technician_name ?? null},
      ${site_id ?? null},
      ${units_worked ?? null},
      ${work_performed ?? null},
      ${site_delays ?? null},
      ${parts_needed ?? null},
      ${engineering_requests ?? null},
      ${notes ?? null}
    )
    RETURNING *
  `
  return NextResponse.json(rows[0], { status: 201 })
}
