import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

// Ensure the junction table exists
async function ensureBomImportSitesTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS public.bom_import_sites (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      bom_import_id uuid NOT NULL REFERENCES public.bom_imports(id) ON DELETE CASCADE,
      site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
      UNIQUE(bom_import_id, site_id)
    )
  `
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  await ensureBomImportSitesTable()

  const rows = await sql`
    SELECT
      b.id,
      b.unit_id,
      b.assembly_number,
      b.bom_description,
      b.source_filename,
      b.imported_at,
      COALESCE(
        array_agg(bis.site_id ORDER BY bis.site_id) FILTER (WHERE bis.site_id IS NOT NULL),
        '{}'::uuid[]
      ) AS site_ids
    FROM public.bom_imports b
    LEFT JOIN public.bom_import_sites bis ON bis.bom_import_id = b.id
    GROUP BY b.id, b.unit_id, b.assembly_number, b.bom_description, b.source_filename, b.imported_at
    ORDER BY b.imported_at DESC
  `
  return NextResponse.json(rows)
}
