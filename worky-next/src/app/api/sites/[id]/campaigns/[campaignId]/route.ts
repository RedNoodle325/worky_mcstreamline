import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id, campaignId } = await params
  const body = await req.json()

  const [row] = await sql`
    UPDATE public.site_campaigns SET
      name = COALESCE(${body.name ?? null}, name),
      campaign_type = COALESCE(${body.campaign_type ?? null}, campaign_type),
      description = COALESCE(${body.description ?? null}, description),
      started_at = COALESCE(${body.started_at ?? null}, started_at),
      completed_at = COALESCE(${body.completed_at ?? null}, completed_at),
      unit_ids = COALESCE(${body.unit_ids ? JSON.stringify(body.unit_ids) : null}, unit_ids),
      updated_at = now()
    WHERE id = ${campaignId} AND site_id = ${id}
    RETURNING *
  `
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; campaignId: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id, campaignId } = await params

  await sql`DELETE FROM public.site_campaigns WHERE id = ${campaignId} AND site_id = ${id}`
  return new NextResponse(null, { status: 204 })
}
