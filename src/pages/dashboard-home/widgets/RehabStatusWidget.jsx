// src/pages/dashboard-home/widgets/RehabStatusWidget.jsx
//
// Widget: "Rehab-státusz" — aktív anamnézisek száma, legfrissebbek.
// Stub: a body-t egy követő agent tölti fel; a keret (WidgetCard, export) végleges.
import { Heart } from 'lucide-react'
import WidgetCard from '../WidgetCard'

export default function RehabStatusWidget() {
  return (
    <WidgetCard icon={Heart} title="Rehab-státusz">
      <p className="text-sm text-slate-400">Hamarosan...</p>
    </WidgetCard>
  )
}
