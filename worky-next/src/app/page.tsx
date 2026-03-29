import { AuthGuard } from '@/components/AuthGuard'
import { Dashboard } from '@/pages-impl/Dashboard'

export default function Page() {
  return <AuthGuard><Dashboard /></AuthGuard>
}
