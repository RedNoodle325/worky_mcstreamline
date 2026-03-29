import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request)
  if (error) return error

  const { id } = await params

  const tickets = await sql`
    SELECT id, site_id, title, description, status, c2_number, parts_ordered, service_lines,
           serial_number, ticket_type, open_date, priority_num, site_company_id, scope_of_work,
           created_at, updated_at
    FROM public.service_tickets
    WHERE site_id = ${id}
    ORDER BY created_at DESC
  `
  return NextResponse.json(tickets)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request)
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { title, description, status, c2_number, parts_ordered, service_lines, scope_of_work } = body

  const rows = await sql`
    INSERT INTO public.service_tickets
      (site_id, title, description, status, c2_number, parts_ordered, service_lines, scope_of_work)
    VALUES
      (${id}, ${title}, ${description ?? null}, ${status ?? null}, ${c2_number ?? null},
       ${parts_ordered ?? null}, ${service_lines ?? null}, ${scope_of_work ?? null})
    RETURNING id, site_id, title, description, status, c2_number, parts_ordered, service_lines,
              serial_number, ticket_type, open_date, priority_num, site_company_id, scope_of_work,
              created_at, updated_at
  `
  return NextResponse.json(rows[0], { status: 201 })
}
