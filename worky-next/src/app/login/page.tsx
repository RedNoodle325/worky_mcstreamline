'use client'

import { Login } from '@/pages-impl/Login'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function LoginPage() {
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated) router.replace('/')
  }, [isAuthenticated, router])

  return <Login />
}
