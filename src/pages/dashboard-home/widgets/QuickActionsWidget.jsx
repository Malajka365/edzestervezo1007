// src/pages/dashboard-home/widgets/QuickActionsWidget.jsx
//
// Widget: "Gyors műveletek" — választható gombkészlet (edző / erőnléti /
// egészség), csak az engedélyezett műveletekkel.
import { useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'
import WidgetCard from '../WidgetCard'
import Button from '../../../components/ui/Button'
import { useTeams } from '../../../context/TeamContext'
import { quickActionsFor } from '../../../lib/widgetData'

export default function QuickActionsWidget({ settings = {} }) {
  const navigate = useNavigate()
  const { currentUserPermissions } = useTeams()
  const actions = quickActionsFor(settings.set || 'coach', currentUserPermissions)

  return (
    <WidgetCard icon={Zap} title="Gyors műveletek">
      {actions.length === 0 ? (
        <p className="text-sm text-muted">Nincs elérhető gyorsművelet.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
          {actions.map((action) => (
            <Button key={action.label} icon={action.icon} onClick={() => navigate(action.path)} className="w-full">
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </WidgetCard>
  )
}
