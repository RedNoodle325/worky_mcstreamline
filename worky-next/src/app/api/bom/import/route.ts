import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

interface BomItem {
  quantity: number
  unit: string
  component: string
  rev: string | null
  description: string
  sortOrder: number
}

function parseBomItems(text: string): BomItem[] {
  const lines = text.split('\n')
  const items: BomItem[] = []
  let foundHeader = false
  let sortOrder = 0

  for (const line of lines) {
    if (!foundHeader) {
      if (/Component/i.test(line) && /Quantity/i.test(line)) {
        foundHeader = true
      }
      continue
    }

    const trimmed = line.trim()
    if (!trimmed) continue

    // Match: Quantity Unit Component [Rev] Description
    // Quantity: number, Unit: 2-3 chars, Component: part number with dashes, Rev: optional letter, Description: rest
    const match = trimmed.match(/^(\d+(?:\.\d+)?)\s+([A-Z]{2,3})\s+([A-Z0-9][A-Z0-9\-]+)\s+(?:([A-Z])\s+)?(.+)$/)
    if (!match) continue

    const component = match[3]
    // Validate component looks like a part number
    if (!/[A-Z0-9]{2,}/.test(component)) continue

    items.push({
      quantity: parseFloat(match[1]),
      unit: match[2],
      component,
      rev: match[4] ?? null,
      description: match[5].trim(),
      sortOrder: sortOrder++,
    })
  }

  return items
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const siteId = formData.get('site_id') as string | null || null
  const unitId = formData.get('unit_id') as string | null || null

  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  const data = await parser.getText()
  const rawText = data.text

  const lines = rawText.split('\n')

  // Parse assembly number
  let assemblyNumber = ''
  for (const line of lines) {
    const m = line.match(/Assembly:\s*([A-Z0-9\-]+)/i)
    if (m) { assemblyNumber = m[1]; break }
  }

  // Parse BOM description
  let bomDesc = ''
  for (const line of lines) {
    const m = line.match(/BOM Desc[:\s]+(.+)/i)
    if (m) { bomDesc = m[1].trim(); break }
  }

  // Insert BOM import record
  const [bomImport] = await sql`
    INSERT INTO public.bom_imports
      (site_id, unit_id, assembly_number, bom_description, source_filename, raw_text)
    VALUES
      (${siteId ?? null}, ${unitId ?? null}, ${assemblyNumber}, ${bomDesc}, ${file.name}, ${rawText})
    RETURNING id, site_id, unit_id, assembly_number, bom_description, source_filename, imported_at
  `

  const items = parseBomItems(rawText)

  for (const item of items) {
    // Upsert into parts_catalog
    const [part] = await sql`
      INSERT INTO public.parts_catalog (part_number, description, unit_of_measure)
      VALUES (${item.component}, ${item.description}, ${item.unit})
      ON CONFLICT (part_number) DO UPDATE SET
        description = EXCLUDED.description,
        unit_of_measure = EXCLUDED.unit_of_measure
      RETURNING *
    `

    // Insert into bom_items
    await sql`
      INSERT INTO public.bom_items
        (bom_import_id, part_catalog_id, quantity, unit_of_measure, component, rev, description, sort_order)
      VALUES
        (${bomImport.id}, ${part.id}, ${item.quantity}, ${item.unit}, ${item.component}, ${item.rev}, ${item.description}, ${item.sortOrder})
    `
  }

  return NextResponse.json({ id: bomImport.id })
}
