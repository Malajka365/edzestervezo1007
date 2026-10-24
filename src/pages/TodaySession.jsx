import { Timer } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'

export default function TodaySession() {
  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <PageHeader title="Mai edzés" />
      <EmptyState icon={Timer} title="Hamarosan" description="A mai edzés oldala készül." />
    </div>
  )
}
