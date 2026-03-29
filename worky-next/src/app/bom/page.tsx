import { AuthGuard } from '@/components/AuthGuard'
import { BOM } from '@/pages-impl/BOM'

export default function Page() {
  return <AuthGuard><BOM /></AuthGuard>
}
