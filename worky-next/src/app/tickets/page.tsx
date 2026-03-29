import { AuthGuard } from '@/components/AuthGuard'
import { Tickets } from '@/pages-impl/Tickets'

export default function Page() {
  return <AuthGuard><Tickets /></AuthGuard>
}
