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
    SELECT
      id, site_id, unit_id, ticket_type, title, description, status, priority,
      unit_tag, reported_by, resolution_notes, reported_date, closed_date,
      cxalloy_issue_id, cxalloy_url, cx_zone, cx_issue_type, cx_source,
      service_ticket_id, created_at, updated_at
    FROM public.issues
    WHERE unit_id = ${id}
    ORDER BY reported_date DESC NULLS LAST, created_at DESC
  `
  return NextResponse.json(rows)
}
