import { AuthGuard } from '@/components/AuthGuard'
import { Report } from '@/pages-impl/Report'

export default function Page() {
  return <AuthGuard><Report /></AuthGuard>
}
