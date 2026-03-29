import { AuthGuard } from '@/components/AuthGuard'
import { Warranty } from '@/pages-impl/Warranty'

export default function Page() {
  return <AuthGuard><Warranty /></AuthGuard>
}
