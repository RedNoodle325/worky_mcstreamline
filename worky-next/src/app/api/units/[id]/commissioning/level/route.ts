import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const level = body.level as number

  if (![1, 2, 3, 4, 5].includes(level)) {
    return NextResponse.json({ error: 'level must be 1-5' }, { status: 400 })
  }

  let rows: any[]

  switch (level) {
    case 1:
      rows = await sql`
        UPDATE public.commissioning_projects SET
          l1_completed = ${body.completed},
          l1_date = ${body.date ?? null},
          l1_completed_by = ${body.completed_by ?? null},
          l1_checklist_url = COALESCE(${body.checklist_url ?? null}, l1_checklist_url),
          l1_checklist_filename = COALESCE(${body.checklist_filename ?? null}, l1_checklist_filename),
          updated_at = now()
        WHERE unit_id = ${id}
        RETURNING *
      `
      break
    case 2:
      rows = await sql`
        UPDATE public.commissioning_projects SET
          l2_completed = ${body.completed},
          l2_date = ${body.date ?? null},
          l2_completed_by = ${body.completed_by ?? null},
          l2_checklist_url = COALESCE(${body.checklist_url ?? null}, l2_checklist_url),
          l2_checklist_filename = COALESCE(${body.checklist_filename ?? null}, l2_checklist_filename),
          updated_at = now()
        WHERE unit_id = ${id}
        RETURNING *
      `
      break
    case 3:
      rows = await sql`
        UPDATE public.commissioning_projects SET
          l3_completed = ${body.completed},
          l3_date = ${body.date ?? null},
          l3_completed_by = ${body.completed_by ?? null},
          l3_checklist_url = COALESCE(${body.checklist_url ?? null}, l3_checklist_url),
          l3_checklist_filename = COALESCE(${body.checklist_filename ?? null}, l3_checklist_filename),
          updated_at = now()
        WHERE unit_id = ${id}
        RETURNING *
      `
      break
    case 4:
      rows = await sql`
        UPDATE public.commissioning_projects SET
          l4_completed = ${body.completed},
          l4_date = ${body.date ?? null},
          l4_completed_by = ${body.completed_by ?? null},
          l4_checklist_url = COALESCE(${body.checklist_url ?? null}, l4_checklist_url),
          l4_checklist_filename = COALESCE(${body.checklist_filename ?? null}, l4_checklist_filename),
          updated_at = now()
        WHERE unit_id = ${id}
        RETURNING *
      `
      break
    case 5:
    default:
      rows = await sql`
        UPDATE public.commissioning_projects SET
          l5_completed = ${body.completed},
          l5_date = ${body.date ?? null},
          l5_completed_by = ${body.completed_by ?? null},
          l5_checklist_url = COALESCE(${body.checklist_url ?? null}, l5_checklist_url),
          l5_checklist_filename = COALESCE(${body.checklist_filename ?? null}, l5_checklist_filename),
          updated_at = now()
        WHERE unit_id = ${id}
        RETURNING *
      `
      break
  }

  // Update unit commission_level
  await sql`
    UPDATE public.units
    SET commission_level = ${body.completed ? `L${level}` : 'none'}
    WHERE id = ${id}
  `

  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: 'Commissioning project not found' }, { status: 404 })
  }

  return NextResponse.json(rows[0])
}
