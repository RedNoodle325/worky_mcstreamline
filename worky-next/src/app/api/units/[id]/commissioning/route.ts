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

  const existing = await sql`
    SELECT * FROM public.commissioning_projects
    WHERE unit_id = ${id}
    LIMIT 1
  `

  if (existing.length > 0) {
    return NextResponse.json(existing[0])
  }

  // Get unit's site_id
  const units = await sql`
    SELECT site_id FROM public.units WHERE id = ${id}
  `
  if (units.length === 0) {
    return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
  }
  const unit = units[0]

  const [created] = await sql`
    INSERT INTO public.commissioning_projects
      (site_id, unit_id, l1_completed, l2_completed, l3_completed, l4_completed, l5_completed)
    VALUES
      (${unit.site_id}, ${id}, false, false, false, false, false)
    RETURNING *
  `

  return NextResponse.json(created)
}
