import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const rows = await sql`
    SELECT id, site_id, unit_id, assembly_number, bom_description, source_filename, imported_at
    FROM public.bom_imports
    ORDER BY imported_at DESC
  `
  return NextResponse.json(rows)
}
