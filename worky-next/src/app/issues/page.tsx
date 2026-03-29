import { AuthGuard } from '@/components/AuthGuard'
import { Issues } from '@/pages-impl/Issues'

export default function Page() {
  return <AuthGuard><Issues /></AuthGuard>
}
