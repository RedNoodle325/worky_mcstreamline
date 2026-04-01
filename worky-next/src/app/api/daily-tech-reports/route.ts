import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

async function ensureSchema() {
  await sql`ALTER TABLE public.daily_tech_reports ADD COLUMN IF NOT EXISTS customer_complaint text`
  await sql`
    CREATE TABLE IF NOT EXISTS public.daily_report_unit_entries (
      id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      report_id         uuid NOT NULL REFERENCES public.daily_tech_reports(id) ON DELETE CASCADE,
      unit_id           uuid REFERENCES public.units(id) ON DELETE SET NULL,
      unit_tag          text,
      unit_serial       text,
      issue_description text,
      resolution        text,
      parts_text        text,
      part_catalog_id   uuid REFERENCES public.parts_catalog(id) ON DELETE SET NULL,
      follow_up_required boolean NOT NULL DEFAULT false,
      photo_urls        text[] NOT NULL DEFAULT '{}',
      sort_order        integer NOT NULL DEFAULT 0,
      created_at        timestamptz DEFAULT now()
    )
  `
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  await ensureSchema()

  const { searchParams } = new URL(req.url)
  const techId   = searchParams.get('technician_id') ?? null
  const siteId   = searchParams.get('site_id') ?? null
  const dateFrom = searchParams.get('date_from') ?? null
  const dateTo   = searchParams.get('date_to') ?? null

  const rows = await sql`
    SELECT
      r.*,
      COALESCE(s.project_name, s.name, '') AS _site_name,
      COALESCE(t.name, r.technician_name, '') AS _technician_name,
      COALESCE(
        (SELECT json_agg(
          json_build_object(
            'id',                 e.id,
            'unit_id',            e.unit_id,
            'unit_tag',           COALESCE(u.tag, e.unit_tag),
            'unit_serial',        COALESCE(u.serial_number, e.unit_serial),
            'issue_description',  e.issue_description,
            'resolution',         e.resolution,
            'parts_text',         e.parts_text,
            'part_catalog_id',    e.part_catalog_id,
            'part_number',        pc.part_number,
            'follow_up_required', e.follow_up_required,
            'photo_urls',         e.photo_urls,
            'sort_order',         e.sort_order
          ) ORDER BY e.sort_order
        )
        FROM public.daily_report_unit_entries e
        LEFT JOIN public.units u ON u.id = e.unit_id
        LEFT JOIN public.parts_catalog pc ON pc.id = e.part_catalog_id
        WHERE e.report_id = r.id),
        '[]'::json
      ) AS unit_entries
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

async function upsertUnitEntries(reportId: string, entries: Record<string, unknown>[]) {
  // Delete old entries and re-insert (simplest for replace semantics)
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

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  await ensureSchema()

  const body = await req.json()
  const {
    report_date, technician_id, technician_name,
    site_id, customer_complaint,
    site_delays, engineering_requests, notes,
    unit_entries = [],
  } = body

  const [report] = await sql`
    INSERT INTO public.daily_tech_reports (
      report_date, technician_id, technician_name,
      site_id, customer_complaint,
      site_delays, engineering_requests, notes
    ) VALUES (
      ${report_date ?? null},
      ${technician_id ?? null},
      ${technician_name ?? null},
      ${site_id ?? null},
      ${customer_complaint ?? null},
      ${site_delays ?? null},
      ${engineering_requests ?? null},
      ${notes ?? null}
    )
    RETURNING *
  `

  if (Array.isArray(unit_entries) && unit_entries.length > 0) {
    await upsertUnitEntries(report.id, unit_entries)
  }

  return NextResponse.json({ ...report, unit_entries }, { status: 201 })
}
