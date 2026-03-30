import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { email_text, site_id } = await req.json()

  if (!email_text?.trim()) {
    return NextResponse.json({ error: 'email_text required' }, { status: 400 })
  }

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Analyze this email and extract the following information as a JSON object with exactly these keys:
- "date": the date the email was sent (as written, or ISO format if clear)
- "to_from": who sent it and to whom (e.g. "From: John Smith <john@co.com>, To: Jane Doe")
- "subject": the email subject line
- "notes": a concise 2-4 sentence summary of the email's main points and context
- "actions": any action items or follow-ups mentioned (as a short bulleted list, or empty string if none)

Return ONLY the raw JSON object with no markdown formatting or explanation. If a field cannot be determined, use an empty string.

Email:
${email_text}`,
    }],
  })

  let parsed: Record<string, string>
  try {
    const text = response.content.find(b => b.type === 'text')?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }

  const content = JSON.stringify({
    date: parsed.date || '',
    to_from: parsed.to_from || '',
    subject: parsed.subject || '',
    notes: parsed.notes || '',
    actions: parsed.actions || '',
  })

  const [note] = await sql`
    INSERT INTO public.notes
      (site_id, unit_id, note_type, content, author, created_at)
    VALUES
      (${site_id || null}, null, 'email', ${content}, ${'AI Summary'}, ${new Date().toISOString()})
    RETURNING *
  `

  return NextResponse.json(note)
}
