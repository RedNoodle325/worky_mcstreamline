import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  const { error } = await requireAuth(request)
  if (error) return error

  const { linkId } = await params

  await sql`DELETE FROM public.issue_line_links WHERE id = ${linkId}`
  return new NextResponse(null, { status: 204 })
}
