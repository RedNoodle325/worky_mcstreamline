import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; techId: string }> }
) {
  const { error } = await requireAuth(request)
  if (error) return error

  const { id, techId } = await params

  await sql`
    DELETE FROM public.job_schedule_techs
    WHERE job_id = ${id} AND technician_id = ${techId}
  `
  return new NextResponse(null, { status: 204 })
}
