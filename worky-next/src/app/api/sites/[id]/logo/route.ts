import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import { uploadFile } from '@/lib/storage'
import sql from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth(req)
  if (error) return error

  const { id } = await params

  const formData = await req.formData()
  const file = (formData.get('logo') ?? formData.get('file')) as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const originalName = file.name ?? ''
  const ext = originalName.includes('.') ? originalName.split('.').pop() : 'bin'

  const buffer = Buffer.from(await file.arrayBuffer())
  const publicUrl = await uploadFile('logos', `logos/${id}.${ext}`, buffer, file.type)

  const [site] = await sql`
    UPDATE public.sites
    SET logo_url = ${publicUrl}, updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `

  if (!site) {
    return NextResponse.json({ error: 'Site not found' }, { status: 404 })
  }

  return NextResponse.json(site)
}
