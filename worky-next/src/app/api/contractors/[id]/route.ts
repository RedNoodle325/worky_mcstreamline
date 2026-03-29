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
    SELECT * FROM public.contractors
    WHERE id = ${id}
  `
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
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
  const { company_name, contact_name, title, email, phone, region, notes, is_active } = body

  const rows = await sql`
    UPDATE public.contractors
    SET
      company_name = COALESCE(${company_name ?? null}, company_name),
      contact_name = COALESCE(${contact_name ?? null}, contact_name),
      title        = COALESCE(${title ?? null}, title),
      email        = COALESCE(${email ?? null}, email),
      phone        = COALESCE(${phone ?? null}, phone),
      region       = COALESCE(${region ?? null}, region),
      notes        = COALESCE(${notes ?? null}, notes),
      is_active    = COALESCE(${is_active ?? null}, is_active),
      updated_at   = now()
    WHERE id = ${id}
    RETURNING *
  `
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id } = await params

  await sql`
    DELETE FROM public.contractors
    WHERE id = ${id}
  `
  return new NextResponse(null, { status: 204 })
}
