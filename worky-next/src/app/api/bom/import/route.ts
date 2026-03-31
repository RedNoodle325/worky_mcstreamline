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

function isGloviaFormat(text: string): boolean {
  return /EGMLBMR|Multilevel Bill Of Materials/i.test(text) ||
    (/Component.*Balloon.*Description/i.test(text) && /Eff Beg/i.test(text))
}

// Parse the Glovia MDC EGMLBMR fixed-width report format.
// Column positions are detected dynamically from the dashes separator line.
function parseGloviaItems(text: string): BomItem[] {
  const lines = text.split('\n')
  const items: BomItem[] = []
  let sortOrder = 0

  // Column boundaries detected from separator line
  // Format: Qty(0-15)  UM  Component  Rev  flags  EffBeg  EffEnd  Balloon  Description
  let qtyEnd    = 16
  let umStart   = 18
  let umEnd     = 20
  let compStart = 21
  let compEnd   = 61   // default for 40-char component
  let descStart = 114  // default for standard Glovia format

  let foundSeparator = false

  for (const line of lines) {
    // Detect the dashes separator line — at least 5 dash-groups, line mostly dashes+spaces
    if (!foundSeparator) {
      const dashCount = (line.match(/-/g) || []).length
      if (dashCount > 30 && /^[\s\-]+$/.test(line)) {
        // Build column groups from the separator
        const groups: Array<{ start: number; end: number }> = []
        let inDash = false
        let gStart = 0
        for (let i = 0; i < line.length; i++) {
          if (line[i] === '-') {
            if (!inDash) { gStart = i; inDash = true }
          } else if (inDash) {
            groups.push({ start: gStart, end: i })
            inDash = false
          }
        }
        if (inDash) groups.push({ start: gStart, end: line.length })

        if (groups.length >= 4) {
          // groups[0] = Quantity, groups[1] = UM, groups[2] = Component, groups[-1] = Description
          qtyEnd    = groups[0].end
          umStart   = groups[1].start
          umEnd     = groups[1].end
          compStart = groups[2].start
          compEnd   = groups[2].end
          descStart = groups[groups.length - 1].start
        }
        foundSeparator = true
        continue
      }
    }

    if (!foundSeparator) continue

    // Skip repeat header lines (multi-page reports re-print the header)
    if (/Quantity.*UM.*Component/i.test(line)) { foundSeparator = false; continue }

    if (!line.trim()) continue

    const qtyStr    = line.substring(0, qtyEnd).trim()
    const um        = line.substring(umStart, umEnd).trim()
    const compRaw   = line.substring(compStart, Math.min(compEnd, line.length)).trim()
    const component = compRaw.replace(/^\.+/, '').trim()  // strip leading dots (assembly level)
    const desc      = line.length > descStart ? line.substring(descStart).trim() : ''

    // Must have qty, UM, and a valid part-number-like component
    if (!qtyStr || !component || !um) continue
    if (!/^\d/.test(qtyStr)) continue
    if (!/[A-Z0-9]/.test(component)) continue

    const quantity = parseFloat(qtyStr)
    if (isNaN(quantity)) continue

    items.push({ quantity, unit: um, component, rev: null, description: desc, sortOrder: sortOrder++ })
  }

  return items
}

// Fallback parser for simpler tab/space-delimited BOM text
function parseFallbackItems(text: string): BomItem[] {
  const lines = text.split('\n')
  const items: BomItem[] = []
  let foundHeader = false
  let sortOrder = 0

  for (const line of lines) {
    if (!foundHeader) {
      if (/Component/i.test(line) && /Quantity/i.test(line)) foundHeader = true
      continue
    }
    const trimmed = line.trim()
    if (!trimmed) continue
    const match = trimmed.match(/^(\d+(?:\.\d+)?)\s+([A-Z]{2,3})\s+([A-Z0-9][A-Z0-9\-]+)\s+(?:([A-Z])\s+)?(.+)$/)
    if (!match) continue
    const component = match[3]
    if (!/[A-Z0-9]{2,}/.test(component)) continue
    items.push({ quantity: parseFloat(match[1]), unit: match[2], component, rev: match[4] ?? null, description: match[5].trim(), sortOrder: sortOrder++ })
  }
  return items
}

function parseBomItems(text: string): BomItem[] {
  return isGloviaFormat(text) ? parseGloviaItems(text) : parseFallbackItems(text)
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

  let rawText: string
  const isTxt = file.name.toLowerCase().endsWith('.txt') || file.type === 'text/plain'
  if (isTxt) {
    rawText = buffer.toString('utf-8')
  } else {
    // PDF
    const { PDFParse } = await import('pdf-parse')
    const parser = new PDFParse({ data: new Uint8Array(buffer) })
    const data = await parser.getText()
    rawText = data.text
  }

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
