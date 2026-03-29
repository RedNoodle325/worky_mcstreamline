import { AuthGuard } from '@/components/AuthGuard'
import { TicketDetail } from '@/pages-impl/TicketDetail'

export default function Page() {
  return <AuthGuard><TicketDetail /></AuthGuard>
}
