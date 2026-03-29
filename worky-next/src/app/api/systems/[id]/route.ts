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
    WHERE s.id = ${id}
  `

  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const [row] = await sql`
    UPDATE sycool_systems SET
      data_hall = COALESCE(${body.data_hall ?? null}, data_hall),
      system_number = COALESCE(${body.system_number ?? null}, system_number),
      updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id } = await params

  await sql`DELETE FROM sycool_systems WHERE id = ${id}`
  return new NextResponse(null, { status: 204 })
}
