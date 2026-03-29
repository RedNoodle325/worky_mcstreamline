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
      s.id, s.site_id, s.data_hall, s.system_number, s.created_at, s.updated_at,
      to_json((
        SELECT row_to_json(r) FROM (
          SELECT u.id, u.asset_tag, u.serial_number, u.commission_level, u.status, u.notes
          FROM units u
          WHERE u.system_id = s.id AND u.unit_type = 'ACCU'
          LIMIT 1
        ) r
      )) AS accu,
      to_json((
        SELECT row_to_json(r) FROM (
          SELECT u.id, u.asset_tag, u.serial_number, u.commission_level, u.status, u.notes
          FROM units u
          WHERE u.system_id = s.id AND u.unit_type = 'CRAC'
          LIMIT 1
        ) r
      )) AS crac
    FROM sycool_systems s
    WHERE s.site_id = ${id}
    ORDER BY s.data_hall, s.system_number
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
  const { data_hall, system_number } = body

  if (!data_hall || system_number === undefined) {
    return NextResponse.json({ error: 'data_hall and system_number required' }, { status: 400 })
  }

  const [row] = await sql`
    INSERT INTO sycool_systems (site_id, data_hall, system_number)
    VALUES (${id}, ${data_hall}, ${system_number})
    RETURNING *
  `
  return NextResponse.json(row, { status: 201 })
}
