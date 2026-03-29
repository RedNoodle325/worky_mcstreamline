import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(request: NextRequest) {
  const { error } = await requireAuth(request)
  if (error) return error

  const tickets = await sql`
    SELECT id, site_id, title, description, status, c2_number, parts_ordered, service_lines,
           serial_number, ticket_type, open_date, priority_num, site_company_id, scope_of_work,
           created_at, updated_at
    FROM public.service_tickets
    ORDER BY created_at DESC
  `
  return NextResponse.json(tickets)
}
