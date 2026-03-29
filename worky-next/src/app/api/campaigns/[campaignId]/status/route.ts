import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { campaignId } = await params

  const rows = await sql`
    SELECT * FROM public.unit_campaign_status
    WHERE campaign_id = ${campaignId}
    ORDER BY updated_at DESC
  `
  return NextResponse.json(rows)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { campaignId } = await params
  const body = await req.json()
  const { unit_id, completed, completed_by, notes } = body
  const by = completed_by ?? null
  const completedAt = completed ? new Date().toISOString() : null

  const [row] = await sql`
    INSERT INTO public.unit_campaign_status
      (campaign_id, unit_id, completed, completed_at, completed_by, notes)
    VALUES
      (${campaignId}, ${unit_id}, ${completed}, ${completedAt}, ${by ?? null}, ${notes ?? null})
    ON CONFLICT (campaign_id, unit_id) DO UPDATE SET
      completed = EXCLUDED.completed,
      completed_at = EXCLUDED.completed_at,
      completed_by = EXCLUDED.completed_by,
      notes = COALESCE(EXCLUDED.notes, unit_campaign_status.notes),
      updated_at = now()
    RETURNING *
  `
  return NextResponse.json(row)
}
