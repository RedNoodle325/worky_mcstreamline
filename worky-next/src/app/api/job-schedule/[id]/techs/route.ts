import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request)
  if (error) return error

  const { id } = await params

  const techs = await sql`
    SELECT t.*
    FROM public.technicians t
    JOIN public.job_schedule_techs jt ON jt.technician_id = t.id
    WHERE jt.job_id = ${id}
    ORDER BY t.name ASC
  `
  return NextResponse.json(techs)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth(request)
  if (error) return error

  const { id } = await params
  const body = await request.json()

  await sql`
    INSERT INTO public.job_schedule_techs (job_id, technician_id)
    VALUES (${id}, ${body.technician_id})
    ON CONFLICT (job_id, technician_id) DO NOTHING
  `
  return new NextResponse(null, { status: 201 })
}
