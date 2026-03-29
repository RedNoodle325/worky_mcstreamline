import { AuthGuard } from '@/components/AuthGuard'
import { ContractorDetail } from '@/pages-impl/ContractorDetail'

export default function Page() {
  return <AuthGuard><ContractorDetail /></AuthGuard>
}
