import { CheckSquare } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'

export default function Attendance() {
  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <PageHeader title="Jelenlét" />
      <EmptyState icon={CheckSquare} title="Hamarosan" description="A jelenlét oldala készül." />
    </div>
  )
}
