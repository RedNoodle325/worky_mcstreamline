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

  const rows = await sql`
    SELECT
      bi.id,
      bi.bom_import_id,
      bi.component        AS part_number,
      bi.description,
      bi.quantity,
      bi.unit_of_measure  AS unit,
      bi.rev,
      bi.sort_order,
      pc.part_number      AS catalog_part_number
    FROM public.bom_items bi
    LEFT JOIN public.parts_catalog pc ON pc.id = bi.part_catalog_id
    WHERE bi.bom_import_id = ${id}
    ORDER BY bi.sort_order
  `
  return NextResponse.json(rows)
}
