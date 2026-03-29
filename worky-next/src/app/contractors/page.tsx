import { AuthGuard } from '@/components/AuthGuard'
import { Contractors } from '@/pages-impl/Contractors'

export default function Page() {
  return <AuthGuard><Contractors /></AuthGuard>
}
