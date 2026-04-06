import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import { uploadFile } from '@/lib/storage'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `reports/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  try {
    const url = await uploadFile('report-photos', path, buffer, file.type || 'image/jpeg')
    return NextResponse.json({ url })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
