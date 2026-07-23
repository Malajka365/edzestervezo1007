// src/pages/dashboard-home/widgets/TeamOverviewWidget.jsx
//
// Widget: "Csapat-áttekintő" — játékosszám + tagok szerepkörönként.
// Stub: a body-t egy követő agent tölti fel; a keret (WidgetCard, export) végleges.
import { Users } from 'lucide-react'
import WidgetCard from '../WidgetCard'

export default function TeamOverviewWidget() {
  return (
    <WidgetCard icon={Users} title="Csapat-áttekintő">
      <p className="text-sm text-slate-400">Hamarosan...</p>
    </WidgetCard>
  )
}
