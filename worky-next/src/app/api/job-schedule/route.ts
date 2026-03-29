import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(request: NextRequest) {
  const { error } = await requireAuth(request)
  if (error) return error

  const { searchParams } = new URL(request.url)
  const weekStart = searchParams.get('week_start') ?? null

  let jobs
  if (weekStart) {
    jobs = await sql`
      SELECT * FROM public.job_schedule
      WHERE (start_date IS NULL OR start_date <= ${weekStart}::DATE + INTERVAL '6 days')
        AND (end_date IS NULL OR end_date >= ${weekStart}::DATE)
      ORDER BY start_date ASC NULLS LAST, job_name ASC
    `
  } else {
    jobs = await sql`
      SELECT * FROM public.job_schedule
      ORDER BY start_date ASC NULLS LAST, job_name ASC
    `
  }

  return NextResponse.json(jobs)
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth(request)
  if (error) return error

  const body = await request.json()

  const rows = await sql`
    INSERT INTO public.job_schedule
      (site_id, pm_id, job_name, job_type, contract_number, priority,
       start_date, end_date, status, notes, scope, techs_needed)
    VALUES
      (${body.site_id}, ${body.pm_id ?? null}, ${body.job_name},
       COALESCE(${body.job_type ?? null}, 'Warranty'),
       ${body.contract_number ?? null},
       COALESCE(${body.priority ?? null}, 3),
       ${body.start_date ?? null}, ${body.end_date ?? null},
       COALESCE(${body.status ?? null}, 'scheduled'),
       ${body.notes ?? null}, ${body.scope ?? null},
       COALESCE(${body.techs_needed ?? null}, 1))
    RETURNING *
  `
  return NextResponse.json(rows[0], { status: 201 })
}
