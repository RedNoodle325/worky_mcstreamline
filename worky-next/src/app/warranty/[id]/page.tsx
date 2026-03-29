import { AuthGuard } from '@/components/AuthGuard'
import { WarrantyDetail } from '@/pages-impl/WarrantyDetail'

export default function Page() {
  return <AuthGuard><WarrantyDetail /></AuthGuard>
}
