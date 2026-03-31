import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(request: NextRequest) {
  const { error } = await requireAuth(request)
  if (error) return error

  const claims = await sql`
    SELECT * FROM public.warranty_claims ORDER BY created_at DESC
  `
  return NextResponse.json(claims)
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth(request)
  if (error) return error

  const body = await request.json()

  const rows = await sql`
    INSERT INTO public.warranty_claims
      (unit_id, site_id, title, claim_number, description,
       submitted_date, status,
       rga_number, c2_ticket_number,
       parts_status, parts_notes,
       tech_dispatched, tech_dispatch_date)
    VALUES
      (${body.unit_id ?? null},
       ${body.site_id ?? null},
       ${body.title ?? null},
       ${body.claim_number ?? null},
       ${body.description ?? null},
       ${body.submitted_date ?? null},
       ${body.status ?? 'submitted'},
       ${body.rga_number ?? null},
       ${body.c2_ticket_number ?? null},
       ${body.parts_status ?? 'not_needed'},
       ${body.parts_notes ?? null},
       ${body.tech_dispatched ?? false},
       ${body.tech_dispatch_date ?? null})
    RETURNING *
  `
  return NextResponse.json(rows[0], { status: 201 })
}
