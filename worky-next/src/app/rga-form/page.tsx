import { AuthGuard } from '@/components/AuthGuard'
import { RgaForm } from '@/pages-impl/RgaForm'
export default function RgaFormPage() { return <AuthGuard><RgaForm /></AuthGuard> }
