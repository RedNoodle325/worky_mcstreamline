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
    SELECT * FROM public.site_job_numbers
    WHERE site_id = ${id}
    ORDER BY is_primary DESC NULLS LAST, created_at ASC
  `
  return NextResponse.json(rows)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { job_number, description, is_primary } = body

  const rows = await sql`
    INSERT INTO public.site_job_numbers (site_id, job_number, description, is_primary)
    VALUES (${id}, ${job_number ?? null}, ${description ?? null}, ${is_primary ?? null})
    RETURNING *
  `
  return NextResponse.json(rows[0], { status: 201 })
}
