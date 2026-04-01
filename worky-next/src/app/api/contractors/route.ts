import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

async function ensureColumns() {
  await sql`ALTER TABLE public.contractors ADD COLUMN IF NOT EXISTS category text`
  await sql`ALTER TABLE public.contractors ADD COLUMN IF NOT EXISTS is_technician boolean NOT NULL DEFAULT false`
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  await ensureColumns()

  const rows = await sql`
    SELECT id, contact_name AS name, company_name AS company, title, email, phone, region, notes, category, is_technician, created_at
    FROM public.contractors
    ORDER BY category ASC, contact_name ASC
  `
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  await ensureColumns()

  const body = await req.json()
  const { title, email, phone, region, notes, specialties, category, is_technician } = body
  const company_name = body.company_name ?? body.company ?? null
  const contact_name = body.contact_name ?? body.name ?? null

  const rows = await sql`
    INSERT INTO public.contractors (company_name, contact_name, title, email, phone, region, notes, category, is_technician)
    VALUES (
      ${company_name ?? null},
      ${contact_name ?? null},
      ${title ?? null},
      ${email ?? null},
      ${phone ?? null},
      ${region ?? null},
      ${notes ?? null},
      ${category ?? null},
      ${is_technician ?? false}
    )
    RETURNING *
  `
  const contractor = rows[0]

  if (Array.isArray(specialties) && specialties.length > 0) {
    for (const specialty of specialties) {
      await sql`
        INSERT INTO public.contractor_specialties (contractor_id, specialty)
        VALUES (${contractor.id}, ${specialty})
      `
    }
  }

  return NextResponse.json(contractor, { status: 201 })
}
