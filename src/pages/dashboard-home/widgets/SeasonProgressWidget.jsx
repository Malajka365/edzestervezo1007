// src/pages/dashboard-home/widgets/SeasonProgressWidget.jsx
//
// Widget: "Szezon-állás" — aktuális szezon: hányadik hét / összes.
// Stub: a body-t egy követő agent tölti fel; a keret (WidgetCard, export) végleges.
import { CalendarRange } from 'lucide-react'
import WidgetCard from '../WidgetCard'

export default function SeasonProgressWidget() {
  return (
    <WidgetCard icon={CalendarRange} title="Szezon-állás">
      <p className="text-sm text-slate-400">Hamarosan...</p>
    </WidgetCard>
  )
}
