// src/pages/dashboard-home/widgets/NextMatchWidget.jsx
//
// Widget: "Következő mérkőzés" — legközelebbi jövőbeli match, napok száma.
// Stub: a body-t egy követő agent tölti fel; a keret (WidgetCard, export) végleges.
import { Medal } from 'lucide-react'
import WidgetCard from '../WidgetCard'

export default function NextMatchWidget() {
  return (
    <WidgetCard icon={Medal} title="Következő mérkőzés">
      <p className="text-sm text-slate-400">Hamarosan...</p>
    </WidgetCard>
  )
}
