import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'
import { XMLParser } from 'fast-xml-parser'

interface AsteaRow {
  request_id: string
  order_id: string
  line_no: string | number
  descr: string
  problem_desc: string
  order_stat_descr: string
  serial_no: string
  callt_id: string
  open_date: string
  priority: string | number
  site_company_id: string
  address_1: string
  bpart_id: string
  bpart_descr: string
  tagno: string
  sa_person_descr: string
  actgr_descr: string
  caller_name: string
  company_descr: string
  pcode_descr: string
  is_in_history: string | number
  order_type_id: string
  cconth_id: string
}

interface Site {
  id: string
  name: string
  project_name: string
  address: string
  city: string
  astea_site_id: string
}

function mapStatus(orderStatDescr: string): string {
  const lower = (orderStatDescr ?? '').toLowerCase().trim()
  if (['invoiced', 'closed', 'complete', 'resolved', 'released'].includes(lower)) return 'complete'
  if (['assigned', 'in progress', 'dispatched', 'order entry', 'glovia'].includes(lower)) return 'in_progress'
  return 'open'
}

function alphanumFirst(str: string, len: number): string {
  return (str ?? '').replace(/[^a-zA-Z0-9]/g, '').slice(0, len).toLowerCase()
}

function matchSite(row: AsteaRow, sites: Site[]): Site | undefined {
  // 1. astea_site_id exact match via callt_id or site_company_id
  const calltId = String(row.callt_id ?? '').trim()
  const siteCompanyId = String(row.site_company_id ?? '').trim()
  if (calltId) {
    const m = sites.find((s) => s.astea_site_id && s.astea_site_id === calltId)
    if (m) return m
  }
  if (siteCompanyId) {
    const m = sites.find((s) => s.astea_site_id && s.astea_site_id === siteCompanyId)
    if (m) return m
  }

  // 2. Address substring match: first 10 alphanumeric chars
  const addrKey = alphanumFirst(row.address_1, 10)
  if (addrKey.length >= 4) {
    const m = sites.find(
      (s) => s.address && alphanumFirst(s.address, 10).startsWith(addrKey.slice(0, 6))
    )
    if (m) return m
  }

  // 3. Company name substring match: first 12 chars
  const compKey = alphanumFirst(row.company_descr, 12)
  if (compKey.length >= 4) {
    const m = sites.find(
      (s) =>
        (s.name && alphanumFirst(s.name, 12).startsWith(compKey.slice(0, 6))) ||
        (s.project_name && alphanumFirst(s.project_name, 12).startsWith(compKey.slice(0, 6)))
    )
    if (m) return m
  }

  return undefined
}

export async function POST(request: NextRequest) {
  const { error } = await requireAuth(request)
  if (error) return error

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const xmlText = await file.text()
  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true })
  const parsed = parser.parse(xmlText)

  // Normalize rows — handle various XML shapes
  let rawRows: AsteaRow[] = []
  const root = parsed?.rows?.row ?? parsed?.root?.row ?? parsed?.data?.row ?? parsed?.Row ?? []
  rawRows = Array.isArray(root) ? root : root ? [root] : []

  // Load sites for matching
  const sites: Site[] = await sql`
    SELECT id, name, project_name, address, city, astea_site_id
    FROM public.sites
  `

  // Group by request_id
  const grouped = new Map<string, AsteaRow[]>()
  for (const row of rawRows) {
    const key = String(row.request_id ?? '')
    if (!key) continue
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(row)
  }

  let created = 0
  let updated = 0
  let unmatched = 0
  const tickets: object[] = []

  for (const [requestId, rows] of grouped) {
    const first = rows[0]

    const title = String(first.descr ?? requestId)
    const description = String(first.problem_desc ?? '')
    const status = mapStatus(String(first.order_stat_descr ?? ''))
    const serialNumber = String(first.serial_no ?? '')
    const ticketType = String(first.order_type_id ?? '')
    const openDate = first.open_date ? String(first.open_date) : null
    const priorityNum = first.priority != null ? Number(first.priority) : null
    const siteCompanyId = String(first.site_company_id ?? '')
    const c2Number = String(requestId)

    const serviceLines = rows.map((r) => ({
      order_id: r.order_id,
      line_no: r.line_no,
      descr: r.descr,
      actgr_descr: r.actgr_descr,
      sa_person_descr: r.sa_person_descr,
      tagno: r.tagno,
      bpart_id: r.bpart_id,
      bpart_descr: r.bpart_descr,
    }))

    const matchedSite = matchSite(first, sites)
    if (!matchedSite) unmatched++

    const siteId = matchedSite?.id ?? null

    // Check if ticket with this c2_number already exists
    const existing = await sql`
      SELECT id FROM public.service_tickets WHERE c2_number = ${c2Number} LIMIT 1
    `

    if (existing.length > 0) {
      const existingId = existing[0].id
      await sql`
        UPDATE public.service_tickets SET
          title           = ${title},
          description     = ${description},
          status          = ${status},
          serial_number   = ${serialNumber},
          ticket_type     = ${ticketType},
          open_date       = ${openDate},
          priority_num    = ${priorityNum},
          site_company_id = ${siteCompanyId},
          site_id         = COALESCE(${siteId}, site_id),
          service_lines   = ${JSON.stringify(serviceLines)},
          updated_at      = now()
        WHERE id = ${existingId}
      `
      updated++
      tickets.push({
        request_id: requestId,
        title,
        status,
        site_name: matchedSite?.name ?? null,
        site_id: siteId,
        serial_number: serialNumber,
        ticket_type: ticketType,
        action: 'updated',
      })
    } else {
      await sql`
        INSERT INTO public.service_tickets
          (site_id, title, description, status, c2_number, parts_ordered, service_lines,
           serial_number, ticket_type, open_date, priority_num, site_company_id)
        VALUES
          (${siteId}, ${title}, ${description}, ${status}, ${c2Number}, false,
           ${JSON.stringify(serviceLines)}, ${serialNumber}, ${ticketType},
           ${openDate}, ${priorityNum}, ${siteCompanyId})
      `
      created++
      tickets.push({
        request_id: requestId,
        title,
        status,
        site_name: matchedSite?.name ?? null,
        site_id: siteId,
        serial_number: serialNumber,
        ticket_type: ticketType,
        action: 'created',
      })
    }
  }

  return NextResponse.json({
    total: grouped.size,
    created,
    updated,
    unmatched,
    tickets,
  })
}
