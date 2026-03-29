import { AuthGuard } from '@/components/AuthGuard'
import { UnitDetail } from '@/pages-impl/UnitDetail'

export default function Page() {
  return <AuthGuard><UnitDetail /></AuthGuard>
}
