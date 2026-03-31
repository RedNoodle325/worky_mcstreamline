import { AuthGuard } from '@/components/AuthGuard'
import { Resources } from '@/pages-impl/Resources'

export default function ResourcesPage() {
  return <AuthGuard><Resources /></AuthGuard>
}
