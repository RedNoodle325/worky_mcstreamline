import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function GET(req: NextRequest) {
  const { error } = await requireAuth(req)
  if (error) return error

  const users = await sql`
    SELECT id, email, display_name, created_at
    FROM public.users
    ORDER BY email ASC
  `

  return NextResponse.json(users)
}
