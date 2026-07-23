// src/pages/dashboard-home/widgets/WeeklyAttendanceWidget.jsx
//
// Widget: "Heti jelenlét" — player_attendance e heti aránya, hiányzók.
// Stub: a body-t egy követő agent tölti fel; a keret (WidgetCard, export) végleges.
import { UserCheck } from 'lucide-react'
import WidgetCard from '../WidgetCard'

export default function WeeklyAttendanceWidget() {
  return (
    <WidgetCard icon={UserCheck} title="Heti jelenlét">
      <p className="text-sm text-slate-400">Hamarosan...</p>
    </WidgetCard>
  )
}
