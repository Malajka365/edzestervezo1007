// src/pages/dashboard-home/widgets/LeaderboardTop3Widget.jsx
//
// Widget: "Ranglista top 3" — legjobb testsúlyarányos 1RM.
// Stub: a body-t egy követő agent tölti fel; a keret (WidgetCard, export) végleges.
import { Trophy } from 'lucide-react'
import WidgetCard from '../WidgetCard'

export default function LeaderboardTop3Widget() {
  return (
    <WidgetCard icon={Trophy} title="Ranglista top 3">
      <p className="text-sm text-slate-400">Hamarosan...</p>
    </WidgetCard>
  )
}
