import { Suspense } from 'react'
import { AuthGuard } from '@/components/AuthGuard'
import { PartsTransfer } from '@/pages-impl/PartsTransfer'
export default function PartsTransferPage() {
  return <AuthGuard><Suspense><PartsTransfer /></Suspense></AuthGuard>
}
