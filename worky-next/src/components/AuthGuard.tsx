'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { Layout } from './Layout'

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace('/login')
  }, [loading, isAuthenticated, router])

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', color: 'var(--text3)', fontSize: 14,
      }}>
        Loading…
      </div>
    )
  }

  if (!isAuthenticated) return null

  return <Layout>{children}</Layout>
}
