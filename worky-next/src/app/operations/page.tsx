import { AuthGuard } from '@/components/AuthGuard'
import { Operations } from '@/pages-impl/Operations'

export default function Page() {
  return <AuthGuard><Operations /></AuthGuard>
}
