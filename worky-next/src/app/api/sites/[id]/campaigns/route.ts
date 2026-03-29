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
      sc.id, sc.site_id, sc.name, sc.campaign_type, sc.description,
      sc.started_at, sc.completed_at, sc.created_at, sc.updated_at, sc.unit_ids,
      CASE
        WHEN sc.unit_ids IS NOT NULL AND jsonb_array_length(sc.unit_ids) > 0
          THEN jsonb_array_length(sc.unit_ids)
        ELSE
          (SELECT COUNT(*) FROM public.units u WHERE u.site_id = sc.site_id AND u.system_id IS NULL)
          + (SELECT COUNT(*) FROM public.sycool_systems ss WHERE ss.site_id = sc.site_id)
      END AS units_total,
      (
        SELECT COUNT(DISTINCT ucs.unit_id)
        FROM public.unit_campaign_status ucs
        WHERE ucs.campaign_id = sc.id
          AND ucs.completed = true
          AND (
            sc.unit_ids IS NULL
            OR jsonb_array_length(sc.unit_ids) = 0
            OR ucs.unit_id::text IN (SELECT jsonb_array_elements_text(sc.unit_ids))
          )
      ) AS units_complete
    FROM public.site_campaigns sc
    WHERE sc.site_id = ${id}
    ORDER BY sc.created_at DESC
  `
  return NextResponse.json(rows)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { name, campaign_type, description, started_at, unit_ids } = body

  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const [row] = await sql`
    INSERT INTO public.site_campaigns
      (site_id, name, campaign_type, description, started_at, unit_ids)
    VALUES
      (${id}, ${name}, ${campaign_type ?? null}, ${description ?? null}, ${started_at ?? null}, ${unit_ids ? JSON.stringify(unit_ids) : null})
    RETURNING *
  `
  return NextResponse.json(row, { status: 201 })
}
