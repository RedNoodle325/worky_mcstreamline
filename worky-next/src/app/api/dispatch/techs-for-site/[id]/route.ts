import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth(request)
  if (error) return error

  const { id: siteId } = await params

  const siteRows = await sql`
    SELECT latitude, longitude FROM public.sites WHERE id = ${siteId}
  `
  const site = siteRows[0]

  if (!site || site.latitude == null || site.longitude == null) {
    const techs = await sql`
      SELECT * FROM public.technicians WHERE is_active = true ORDER BY name ASC
    `
    return NextResponse.json(techs)
  }

  const lat = site.latitude
  const lng = site.longitude

  const techs = await sql`
    SELECT
      t.id, t.name, t.location_city, t.location_state, t.latitude, t.longitude,
      t.is_active, t.notes, t.created_at, t.updated_at,
      CASE
        WHEN t.latitude IS NOT NULL AND t.longitude IS NOT NULL
          THEN 3958.8 * acos(LEAST(1.0,
            cos(radians(${lat})) * cos(radians(t.latitude)) *
            cos(radians(t.longitude) - radians(${lng})) +
            sin(radians(${lat})) * sin(radians(t.latitude))
          ))
        ELSE NULL
      END AS distance_miles,
      false AS has_pto
    FROM public.technicians t
    WHERE t.is_active = true
    ORDER BY distance_miles ASC NULLS LAST, t.name ASC
  `
  return NextResponse.json(techs)
}
