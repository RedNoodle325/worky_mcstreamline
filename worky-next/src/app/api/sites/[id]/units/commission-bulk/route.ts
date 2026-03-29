import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const updates: Array<{ unit_id: string; commission_level: string }> = body.updates ?? []

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: 'updates array required' }, { status: 400 })
  }

  let updated = 0

  for (const { unit_id, commission_level } of updates) {
    if (!unit_id || !commission_level) continue
    await sql`
      UPDATE public.units
      SET commission_level = ${commission_level}, updated_at = now()
      WHERE id = ${unit_id} AND site_id = ${id}
    `
    updated++
  }

  return NextResponse.json({ updated })
}
