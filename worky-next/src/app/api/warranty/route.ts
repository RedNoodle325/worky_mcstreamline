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
      (unit_id, site_id, issue_id, astea_request_id, description, status)
    VALUES
      (${body.unit_id}, ${body.site_id}, ${body.issue_id ?? null},
       ${body.astea_request_id ?? null}, ${body.description}, 'submitted')
    RETURNING *
  `
  return NextResponse.json(rows[0], { status: 201 })
}
