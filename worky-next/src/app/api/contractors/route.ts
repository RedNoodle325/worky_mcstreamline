import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const rows = await sql`
    SELECT * FROM public.contractors
    ORDER BY company_name ASC
  `
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const body = await req.json()
  const { title, email, phone, region, notes, specialties } = body
  // Accept both DB column names and frontend-friendly aliases
  const company_name = body.company_name ?? body.company ?? null
  const contact_name = body.contact_name ?? body.name ?? null

  const rows = await sql`
    INSERT INTO public.contractors (company_name, contact_name, title, email, phone, region, notes)
    VALUES (
      ${company_name ?? null},
      ${contact_name ?? null},
      ${title ?? null},
      ${email ?? null},
      ${phone ?? null},
      ${region ?? null},
      ${notes ?? null}
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
