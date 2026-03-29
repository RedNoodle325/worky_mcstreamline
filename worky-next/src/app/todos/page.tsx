import { AuthGuard } from '@/components/AuthGuard'
import { Todos } from '@/pages-impl/Todos'

export default function Page() {
  return <AuthGuard><Todos /></AuthGuard>
}
