import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'
import Papa from 'papaparse'

function mapManufacturer(raw: string): string {
  const mapping: Record<string, string> = {
    MUNTERS_US: 'Munters',
  }
  return mapping[raw] ?? raw
}

function parseInstallDate(raw: string): string | null {
  if (!raw) return null
  // Format: "YYYY-MM-DD HH:MM:SS AM/PM" or "YYYY-MM-DD HH:MM:SS"
  try {
    const d = new Date(raw)
    if (!isNaN(d.getTime())) return d.toISOString()
  } catch {
    // ignore
  }
  return null
}

function mapStatus(raw: string): string {
  if (raw === 'Installed') return 'active'
  return 'inactive'
}

function extractUnitType(bpartId: string): string {
  if (!bpartId) return ''
  // unit_type is the suffix after the last dash or underscore
  const parts = bpartId.split(/[-_]/)
  return parts[parts.length - 1] ?? ''
}

function extractJobNumber(bpartId: string): string {
  if (!bpartId) return ''
  // job_number is everything before the last dash or underscore segment
  const parts = bpartId.split(/[-_]/)
  return parts.slice(0, -1).join('-')
}

function extractLineNumber(serialNo: string): string {
  if (!serialNo) return ''
  // line_number is the suffix after the last dash
  const parts = serialNo.split('-')
  return parts[parts.length - 1] ?? ''
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id } = await params
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })

  const text = await file.text()
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  })

  let imported = 0
  let skippedCount = 0

  for (const row of data) {
    const bpartId = row['bpart_id'] ?? ''
    const serialNo = row['serial_no'] ?? ''

    if (!bpartId && !serialNo) {
      skippedCount++
      continue
    }

    const unit_type = extractUnitType(bpartId)
    const serial_number = serialNo || null
    const job_number = extractJobNumber(bpartId) || null
    const line_number = extractLineNumber(serialNo) || null
    const manufacturer = row['manufacturer'] ? mapManufacturer(row['manufacturer']) : null
    const description = row['description'] ?? row['item_description'] ?? null
    const location_in_site = row['location'] ?? row['location_in_site'] ?? null
    const install_date = parseInstallDate(row['install_date'] ?? row['installation_date'] ?? '')
    const status = mapStatus(row['status'] ?? '')

    try {
      await sql`
        INSERT INTO public.units
          (site_id, unit_type, serial_number, job_number, line_number, manufacturer, description, location_in_site, install_date, status, commission_level)
        VALUES
          (${id}, ${unit_type || null}, ${serial_number}, ${job_number}, ${line_number}, ${manufacturer}, ${description}, ${location_in_site}, ${install_date}, ${status}, 'none')
      `
      imported++
    } catch {
      skippedCount++
    }
  }

  return NextResponse.json({ imported, skipped: skippedCount })
}
