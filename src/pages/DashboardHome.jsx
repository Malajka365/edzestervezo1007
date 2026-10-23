import { useState } from 'react'
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
import Button from '../components/ui/Button'
import PageHeader from '../components/ui/PageHeader'
import CustomizeEditor from './dashboard-home/CustomizeEditor'

// Index route content for /dashboard: page header (date + Testreszabás) + a customizable grid
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

  const { prefs, loading: prefsLoading, savePrefs } = useDashboardPrefs(
    session?.user?.id,
    selectedTeam?.id
  )

  const [editorOpen, setEditorOpen] = useState(false)

  const loading = permissionsLoading || prefsLoading

  // A forráslista: mentett prefs, vagy szerepkör-alapú default.
  const sourceList =
    prefs ?? getDefaultWidgets(currentUserRole, currentUserPermissions)

  // Amit a felhasználó egyáltalán láthat (jogosultság szerint).
  const allowedWidgets = filterAllowedWidgets(currentUserPermissions)
  const allowedKeys = new Set(allowedWidgets.map((w) => w.key))

  // Látható + engedélyezett + a registryben létező widgetek, sorrendben.
  const widgetsToRender = sourceList.filter(
    (item) => item.visible && allowedKeys.has(item.key) && WIDGETS_BY_KEY[item.key]
  )

  const today = new Intl.DateTimeFormat('hu-HU', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date())

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <PageHeader
        title="Kezdőlap"
        description={today}
        actions={
          <Button icon={Settings} onClick={() => setEditorOpen(true)}>
            Testreszabás
          </Button>
        }
      />

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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {widgetsToRender.map((item) => {
            const Widget = WIDGETS_BY_KEY[item.key].component
            return <Widget key={item.key} />
          })}
        </div>
      )}

      {editorOpen && (
        <CustomizeEditor
          sourceList={sourceList}
          allowedWidgets={allowedWidgets}
          role={currentUserRole}
          permissions={currentUserPermissions}
          savePrefs={savePrefs}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </div>
  )
}
