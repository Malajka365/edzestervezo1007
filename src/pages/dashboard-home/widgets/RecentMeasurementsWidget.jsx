// src/pages/dashboard-home/widgets/RecentMeasurementsWidget.jsx
//
// Widget: "Friss mérések" — utolsó 5 measurement (játékos + gyakorlat + érték).
// Stub: a body-t egy követő agent tölti fel; a keret (WidgetCard, export) végleges.
import { BarChart3 } from 'lucide-react'
import WidgetCard from '../WidgetCard'

export default function RecentMeasurementsWidget() {
  return (
    <WidgetCard icon={BarChart3} title="Friss mérések">
      <p className="text-sm text-slate-400">Hamarosan...</p>
    </WidgetCard>
  )
}
