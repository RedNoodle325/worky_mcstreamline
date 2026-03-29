import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { extractToken, verifyToken, type Claims } from './auth'

type AuthResult =
  | { error: NextResponse; claims?: never }
  | { error?: never; claims: Claims }

export async function requireAuth(req: NextRequest | Request): Promise<AuthResult> {
  const token = extractToken(req)
  if (token) {
    const claims = await verifyToken(token)
    if (claims) return { claims }
  }
  // No valid token — allow read access as anonymous
  return { claims: { sub: 'anon', email: '', name: 'Guest' } }
}
