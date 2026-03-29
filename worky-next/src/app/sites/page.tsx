import { AuthGuard } from '@/components/AuthGuard'
import { Sites } from '@/pages-impl/Sites'

export default function Page() {
  return <AuthGuard><Sites /></AuthGuard>
}
