import { AuthGuard } from '@/components/AuthGuard'
import { Contacts } from '@/pages-impl/Contacts'

export default function Page() {
  return <AuthGuard><Contacts /></AuthGuard>
}
