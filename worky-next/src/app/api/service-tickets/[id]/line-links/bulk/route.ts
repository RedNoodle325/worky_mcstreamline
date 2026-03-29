import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request)
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { issue_ids, order_id }: { issue_ids: string[]; order_id: string } = body

  const results = []
  for (const issue_id of issue_ids) {
    const rows = await sql`
      INSERT INTO public.issue_line_links (issue_id, service_ticket_id, order_id)
      VALUES (${issue_id}, ${id}, ${order_id})
      ON CONFLICT (issue_id, order_id) DO NOTHING
      RETURNING id, issue_id, service_ticket_id, order_id, created_at
    `
    if (rows.length > 0) {
      results.push(rows[0])
    }
  }

  return NextResponse.json(results, { status: 201 })
}
