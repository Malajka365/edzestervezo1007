// src/pages/dashboard-home/widgets/QuickActionsWidget.jsx
//
// Widget: "Gyors műveletek" — navigációs gombok (Új edzés, Új mérés, Új játékos).
// A gombok egyenkénti jogosultság-szűrését (canEditModule) egy követő agent
// implementálja. Stub: a keret (WidgetCard, export) végleges.
import { Zap } from 'lucide-react'
import WidgetCard from '../WidgetCard'

export default function QuickActionsWidget() {
  return (
    <WidgetCard icon={Zap} title="Gyors műveletek">
      <p className="text-sm text-slate-400">Hamarosan...</p>
    </WidgetCard>
  )
}
