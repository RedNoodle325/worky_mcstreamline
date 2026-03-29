import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id, jobId } = await params
  const body = await req.json()
  const { job_number, description, is_primary } = body

  const rows = await sql`
    UPDATE public.site_job_numbers
    SET
      job_number  = COALESCE(${job_number ?? null}, job_number),
      description = COALESCE(${description ?? null}, description),
      is_primary  = COALESCE(${is_primary ?? null}, is_primary)
    WHERE id = ${jobId} AND site_id = ${id}
    RETURNING *
  `
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id, jobId } = await params

  await sql`
    DELETE FROM public.site_job_numbers
    WHERE id = ${jobId} AND site_id = ${id}
  `
  return new NextResponse(null, { status: 204 })
}
