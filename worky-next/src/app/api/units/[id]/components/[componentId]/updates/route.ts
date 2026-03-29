import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; componentId: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { componentId } = await params

  const rows = await sql`
    SELECT id, component_id, description, performed_by, date, created_at
    FROM public.component_updates
    WHERE component_id = ${componentId}
    ORDER BY date DESC NULLS LAST, created_at DESC
  `
  return NextResponse.json(rows)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; componentId: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { componentId } = await params
  const body = await req.json()
  const desc = body.description
  const by = body.performed_by ?? null
  const date = body.date ?? null

  if (!desc) return NextResponse.json({ error: 'description required' }, { status: 400 })

  const [row] = await sql`
    INSERT INTO public.component_updates
      (component_id, description, performed_by, date)
    VALUES
      (${componentId}, ${desc}, ${by}, ${date}::DATE)
    RETURNING id, component_id, description, performed_by, date, created_at
  `
  return NextResponse.json(row, { status: 201 })
}
