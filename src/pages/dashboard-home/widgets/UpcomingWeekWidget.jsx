// src/pages/dashboard-home/widgets/UpcomingWeekWidget.jsx
//
// Widget: "Következő 7 nap" — training_sessions + matches (ma + 7 nap), időrendben.
// Stub: a body-t egy követő agent tölti fel; a keret (WidgetCard, export) végleges.
import { CalendarDays } from 'lucide-react'
import WidgetCard from '../WidgetCard'

export default function UpcomingWeekWidget() {
  return (
    <WidgetCard icon={CalendarDays} title="Következő 7 nap">
      <p className="text-sm text-slate-400">Hamarosan...</p>
    </WidgetCard>
  )
}
