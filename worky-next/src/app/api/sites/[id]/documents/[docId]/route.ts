import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id, docId } = await params

  const rows = await sql`
    SELECT * FROM public.site_documents WHERE id = ${docId} AND site_id = ${id}
  `
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await sql`DELETE FROM public.site_documents WHERE id = ${docId}`
  return new NextResponse(null, { status: 204 })
}
