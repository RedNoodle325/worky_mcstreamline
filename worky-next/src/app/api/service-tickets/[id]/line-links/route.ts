import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request)
  if (error) return error

  const { id } = await params

  const links = await sql`
    SELECT id, issue_id, service_ticket_id, order_id, created_at
    FROM public.issue_line_links
    WHERE service_ticket_id = ${id}
    ORDER BY order_id, created_at
  `
  return NextResponse.json(links)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request)
  if (error) return error

  const { id } = await params
  const body = await request.json()

  const rows = await sql`
    INSERT INTO public.issue_line_links (issue_id, service_ticket_id, order_id)
    VALUES (${body.issue_id}, ${id}, ${body.order_id})
    ON CONFLICT (issue_id, order_id) DO NOTHING
    RETURNING id, issue_id, service_ticket_id, order_id, created_at
  `
  return NextResponse.json(rows[0] ?? null, { status: 201 })
}
