import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id, contactId } = await params
  const body = await req.json()
  const { contact_type, name, role, phone, email, notes } = body

  const rows = await sql`
    UPDATE public.site_contacts
    SET
      contact_type = COALESCE(${contact_type ?? null}, contact_type),
      name         = COALESCE(${name ?? null}, name),
      role         = COALESCE(${role ?? null}, role),
      phone        = COALESCE(${phone ?? null}, phone),
      email        = COALESCE(${email ?? null}, email),
      notes        = COALESCE(${notes ?? null}, notes),
      updated_at   = now()
    WHERE id = ${contactId} AND site_id = ${id}
    RETURNING *
  `
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rows[0])
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id, contactId } = await params

  await sql`
    DELETE FROM public.site_contacts
    WHERE id = ${contactId} AND site_id = ${id}
  `
  return new NextResponse(null, { status: 204 })
}
