import { Layout } from '@/components/Layout'
import { DailyTechReports } from '@/pages-impl/DailyTechReports'

export const metadata = { title: 'Daily Tech Reports' }

export default function DailyTechReportsPage() {
  return (
    <Layout>
      <DailyTechReports />
    </Layout>
  )
}
