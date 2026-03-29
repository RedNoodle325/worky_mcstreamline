import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'

export async function POST(req: NextRequest) {
  const { error } = await requireAuth(req)
  if (error) return error

  return new NextResponse(null, { status: 200 })
}
