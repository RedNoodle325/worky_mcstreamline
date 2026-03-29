import { AuthGuard } from '@/components/AuthGuard'
import { SiteDetail } from '@/pages-impl/SiteDetail'

export default function Page() {
  return <AuthGuard><SiteDetail /></AuthGuard>
}
