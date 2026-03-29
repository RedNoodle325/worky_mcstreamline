import { AuthGuard } from '@/components/AuthGuard'
import { SiteForm } from '@/pages-impl/SiteForm'

export default function Page() {
  return <AuthGuard><SiteForm /></AuthGuard>
}
