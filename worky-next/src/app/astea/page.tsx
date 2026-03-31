import { AuthGuard } from '@/components/AuthGuard'
import { AsteaWizard } from '@/pages-impl/AsteaWizard'

export default function AsteaPage() {
  return <AuthGuard><AsteaWizard /></AuthGuard>
}
