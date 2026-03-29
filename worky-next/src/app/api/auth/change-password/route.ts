import { NextRequest, NextResponse } from 'next/server'
import { compare, hash } from 'bcryptjs'
import { requireAuth } from '@/lib/requireAuth'
import sql from '@/lib/db'

export async function POST(req: NextRequest) {
  const { error, claims } = await requireAuth(req)
  if (error) return error

  const { current_password, new_password } = await req.json()

  if (!current_password || !new_password) {
    return NextResponse.json({ error: 'current_password and new_password are required' }, { status: 400 })
  }

  const rows = await sql`
    SELECT password_hash FROM public.users WHERE email = ${claims.email}
  `

  const user = rows[0]
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const valid = await compare(current_password, user.password_hash)
  if (!valid) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
  }

  if (new_password.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 })
  }

  const newHash = await hash(new_password, 12)

  await sql`UPDATE public.users SET password_hash = ${newHash} WHERE email = ${claims.email}`

  return new NextResponse(null, { status: 204 })
}
