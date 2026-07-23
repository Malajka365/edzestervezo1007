import { useOutletContext } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { useTeams } from '../context/TeamContext'
import { useDashboardPrefs } from '../hooks/useDashboardPrefs'
import {
  getDefaultWidgets,
  filterAllowedWidgets,
  WIDGETS_BY_KEY,
} from '../lib/dashboardWidgets'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'

// Index route content for /dashboard: slim welcome line + a customizable grid
// of live-data widgets. The old module quick-access grid and next-steps card
// were removed (navigation lives in the sidebar) — ld. a widget-dashboard spec.
//
// Widget-feloldás sorrendje:
//   1. mentett prefs (useDashboardPrefs) — ha van sor;
//   2. ha nincs => szerepkör-alapú default (getDefaultWidgets);
//   3. láthatóság (visible:true) + jogosultság-szűrés (filterAllowedWidgets);
//   4. registry-komponensek renderelése a lista sorrendjében.
export default function DashboardHome() {
  const { session } = useOutletContext()
  const { selectedTeam, currentUserRole, currentUserPermissions, permissionsLoading } = useTeams()

  const { prefs, loading: prefsLoading } = useDashboardPrefs(
    session?.user?.id,
    selectedTeam?.id
  )

  const loading = permissionsLoading || prefsLoading

  // A forráslista: mentett prefs, vagy szerepkör-alapú default.
  const sourceList =
    prefs ?? getDefaultWidgets(currentUserRole, currentUserPermissions)

  // Amit a felhasználó egyáltalán láthat (jogosultság szerint).
  const allowedKeys = new Set(
    filterAllowedWidgets(currentUserPermissions).map((w) => w.key)
  )

  // Látható + engedélyezett + a registryben létező widgetek, sorrendben.
  const widgetsToRender = sourceList.filter(
    (item) => item.visible && allowedKeys.has(item.key) && WIDGETS_BY_KEY[item.key]
  )

  return (
    <main className="p-6">
      <div className="space-y-6">
        {/* Slim welcome + Testreszabás gomb */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-slate-300">
            Üdvözöllek a TeamFlow-ban!{' '}
            <span className="text-primary-400 font-medium">{session.user.email}</span>
          </p>
          <button
            type="button"
            disabled
            title="Hamarosan"
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-400 bg-slate-800 border border-slate-700 rounded-lg cursor-not-allowed flex-shrink-0"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Testreszabás</span>
          </button>
        </div>

        {/* Widget grid / loading / empty */}
        {loading ? (
          <LoadingSpinner size="inline" />
        ) : widgetsToRender.length === 0 ? (
          <EmptyState
            icon={Settings}
            title="Nincs megjeleníthető widget"
            description="A csapat-szerepköröd jogosultságai alapján jelenleg nincs megjeleníthető widget."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {widgetsToRender.map((item) => {
              const Widget = WIDGETS_BY_KEY[item.key].component
              return <Widget key={item.key} />
            })}
          </div>
        )}
      </div>
    </main>
  )
}
