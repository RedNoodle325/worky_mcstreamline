import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'
import { uploadFile } from '@/lib/storage'
import { randomUUID } from 'crypto'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const { id } = await params

  const rows = await sql`
    SELECT * FROM public.site_documents
    WHERE site_id = ${id}
    ORDER BY uploaded_at DESC
  `
  return NextResponse.json(rows)
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
  const docType = formData.get('doc_type') as string | null
  const name = formData.get('name') as string | null
  const description = formData.get('description') as string | null

  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const contentType = file.type || 'application/octet-stream'

  const ext = file.name.split('.').pop() ?? 'bin'
  const storagePath = `documents/${id}/${randomUUID()}.${ext}`

  const publicUrl = await uploadFile('documents', storagePath, buffer, contentType)

  const [row] = await sql`
    INSERT INTO public.site_documents
      (site_id, doc_type, name, original_filename, url, file_size, description)
    VALUES
      (${id}, ${docType ?? null}, ${name}, ${file.name}, ${publicUrl}, ${file.size}, ${description ?? null})
    RETURNING *
  `
  return NextResponse.json(row, { status: 201 })
}
