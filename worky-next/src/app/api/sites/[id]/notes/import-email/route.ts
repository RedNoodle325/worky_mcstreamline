import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

interface ParsedEmail {
  from_name: string
  from_email: string
  sent: string
  to: string
  subject: string
  body: string
}

function dedup(text: string): string {
  // Remove consecutive duplicate characters that appear in pairs (Outlook PDF export artifact)
  // e.g. "HHeelllloo" -> "Hello"
  return text.replace(/(.)\1+/g, (match, char) => {
    // Only collapse if the run is even-numbered (suggests duplication artifact)
    if (match.length % 2 === 0) return char
    return match
  })
}

function parseDate(str: string): string | null {
  if (!str) return null
  try {
    const d = new Date(str)
    if (!isNaN(d.getTime())) return d.toISOString()
  } catch {
    // ignore
  }
  return null
}

function parseEmailChain(text: string): ParsedEmail[] {
  // Split on "From:" lines that start email headers
  const blocks = text.split(/(?=^From:\s)/m).filter(b => b.trim().length > 0)
  const emails: ParsedEmail[] = []

  for (const block of blocks) {
    const lines = block.split('\n')

    let from_name = ''
    let from_email = ''
    let sent = ''
    let to = ''
    let subject = ''
    let bodyStart = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const fromMatch = line.match(/^From:\s*(.+)/i)
      const sentMatch = line.match(/^Sent:\s*(.+)/i)
      const toMatch = line.match(/^To:\s*(.+)/i)
      const subjectMatch = line.match(/^Subject:\s*(.+)/i)

      if (fromMatch) {
        const fromStr = fromMatch[1].trim()
        // Try to parse "Name <email>" or just "email"
        const nameEmailMatch = fromStr.match(/^(.+?)\s*<([^>]+)>/)
        if (nameEmailMatch) {
          from_name = nameEmailMatch[1].trim()
          from_email = nameEmailMatch[2].trim()
        } else {
          from_email = fromStr
          from_name = ''
        }
      } else if (sentMatch) {
        sent = sentMatch[1].trim()
      } else if (toMatch) {
        to = toMatch[1].trim()
      } else if (subjectMatch) {
        subject = subjectMatch[1].trim()
        bodyStart = i + 1
        // Skip blank line after headers
        if (bodyStart < lines.length && lines[bodyStart].trim() === '') {
          bodyStart++
        }
        break
      }
    }

    if (!from_email && !from_name) continue

    const body = lines.slice(bodyStart).join('\n').trim()

    emails.push({ from_name, from_email, sent, to, subject, body })
  }

  return emails
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id } = await params
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  const data = await parser.getText()
  const rawText = data.text

  const cleanedText = dedup(rawText)
  const emails = parseEmailChain(cleanedText)

  const imported: any[] = []

  for (const email of emails) {
    const author = email.from_name || email.from_email || 'Unknown'
    const createdAt = parseDate(email.sent) ?? new Date().toISOString()

    const [note] = await sql`
      INSERT INTO public.notes
        (site_id, unit_id, note_type, content, author, created_at)
      VALUES
        (${id}, null, 'email', ${email.body}, ${author}, ${createdAt})
      RETURNING *
    `
    imported.push(note)
  }

  return NextResponse.json({ imported: imported.length, emails: imported })
}
