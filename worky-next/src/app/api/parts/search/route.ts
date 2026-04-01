import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q') ?? ''

  const rows = await sql`
    SELECT id, part_number, description, unit_of_measure AS unit
    FROM public.parts_catalog
    WHERE part_number ILIKE ${'%' + q + '%'}
       OR description ILIKE ${'%' + q + '%'}
    ORDER BY part_number
    LIMIT 100
  `
  return NextResponse.json(rows)
}
