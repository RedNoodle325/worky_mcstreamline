import { AuthGuard } from '@/components/AuthGuard'
import { CSTickets } from '@/pages-impl/CSTickets'

export default function Page() {
  return <AuthGuard><CSTickets /></AuthGuard>
}
