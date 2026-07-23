// src/pages/dashboard-home/widgets/QuickActionsWidget.jsx
//
// Widget: "Gyors műveletek" — navigációs gombok (Új edzés, Új mérés, Új játékos).
import { useNavigate } from 'react-router-dom'
import { Zap, CalendarPlus, LineChart, UserPlus } from 'lucide-react'
import WidgetCard from '../WidgetCard'
import { useTeams } from '../../../context/TeamContext'
import { canEditModule } from '../../../lib/permissions'

const ACTIONS = [
  { key: 'calendar', label: 'Új edzés', path: '/dashboard/naptar', icon: CalendarPlus },
  { key: 'measurement', label: 'Új mérés', path: '/dashboard/meresek', icon: LineChart },
  { key: 'players', label: 'Új játékos', path: '/dashboard/csapatok', icon: UserPlus },
]

export default function QuickActionsWidget() {
  const navigate = useNavigate()
  const { currentUserPermissions } = useTeams()

  const availableActions = ACTIONS.filter((action) =>
    canEditModule(currentUserPermissions, action.key)
  )

  return (
    <WidgetCard icon={Zap} title="Gyors műveletek">
      {availableActions.length === 0 ? (
        <p className="text-sm text-slate-400">Nincs elérhető gyorsművelet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {availableActions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => navigate(action.path)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 bg-slate-700/40 hover:bg-slate-700/70 rounded-lg transition-colors"
            >
              <action.icon className="w-4 h-4 text-primary-400" />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </WidgetCard>
  )
}
