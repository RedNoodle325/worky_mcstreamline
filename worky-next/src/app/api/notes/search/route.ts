import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? ''
  const siteId = searchParams.get('site_id') ?? null
  const unitId = searchParams.get('unit_id') ?? null

  const rows = await sql`
    SELECT
      n.id, n.site_id, n.unit_id, n.note_type, n.content, n.author, n.created_at, n.updated_at,
      s.project_name AS site_name,
      u.serial_number AS unit_serial,
      u.asset_tag AS unit_asset_tag,
      u.unit_type AS unit_type
    FROM public.notes n
    LEFT JOIN public.sites s ON s.id = n.site_id
    LEFT JOIN public.units u ON u.id = n.unit_id
    WHERE (${q}::TEXT = '' OR LOWER(n.content) LIKE ${'%' + q.toLowerCase() + '%'}
      OR LOWER(COALESCE(n.author,'')) LIKE ${'%' + q.toLowerCase() + '%'}
      OR LOWER(COALESCE(s.project_name,'')) LIKE ${'%' + q.toLowerCase() + '%'}
      OR LOWER(COALESCE(u.serial_number,'')) LIKE ${'%' + q.toLowerCase() + '%'}
      OR LOWER(COALESCE(u.asset_tag,'')) LIKE ${'%' + q.toLowerCase() + '%'})
    AND (${siteId ?? null}::UUID IS NULL OR n.site_id = ${siteId ?? null})
    AND (${unitId ?? null}::UUID IS NULL OR n.unit_id = ${unitId ?? null})
    ORDER BY n.created_at DESC
    LIMIT 200
  `
  return NextResponse.json(rows)
}
