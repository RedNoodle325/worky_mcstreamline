import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(request: NextRequest) {
  const { error } = await requireAuth(request)
  if (error) return error

  const links = await sql`
    SELECT id, issue_id, service_ticket_id, order_id, created_at
    FROM public.issue_line_links
    ORDER BY created_at
  `
  return NextResponse.json(links)
}
