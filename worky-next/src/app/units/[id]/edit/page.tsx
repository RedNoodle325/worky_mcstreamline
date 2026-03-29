import { AuthGuard } from '@/components/AuthGuard'
import { UnitForm } from '@/pages-impl/UnitForm'

export default function Page() {
  return <AuthGuard><UnitForm /></AuthGuard>
}
