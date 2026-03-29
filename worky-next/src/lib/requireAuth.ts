import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { extractToken, verifyToken, type Claims } from './auth'

type AuthResult =
  | { error: NextResponse; claims?: never }
  | { error?: never; claims: Claims }

export async function requireAuth(req: NextRequest | Request): Promise<AuthResult> {
  const token = extractToken(req)
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const claims = await verifyToken(token)
  if (!claims) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { claims }
}
