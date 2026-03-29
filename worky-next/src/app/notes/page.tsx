import { AuthGuard } from '@/components/AuthGuard'
import { Notes } from '@/pages-impl/Notes'

export default function Page() {
  return <AuthGuard><Notes /></AuthGuard>
}
