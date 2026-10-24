import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { LayoutGrid, Check, Plus, RotateCcw, Settings } from 'lucide-react'
import { useTeams } from '../context/TeamContext'
import { useDashboardPrefs } from '../hooks/useDashboardPrefs'
import { WIDGET_COMPONENTS } from '../lib/dashboardWidgets'
import { addItem, defaultLayout, normalizeLayout, visibleItems } from '../lib/dashboardLayout'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import PageHeader from '../components/ui/PageHeader'
import HomeGrid from './dashboard-home/HomeGrid'
import WidgetCatalog from './dashboard-home/WidgetCatalog'
import WidgetSettings from './dashboard-home/WidgetSettings'

const SAVE_DELAY_MS = 600

// A Kezdőlap: a felhasználó saját, csapatonként mentett widget-elrendezése
// (húzás, méretezés, beállítás, katalógus). Mentés nélkül a csapatbeli szerep
// alap-elrendezése látszik. A jogosultság nélküli widgetek rejtve maradnak,
// de a tárolt elrendezésből nem törlődnek.
export default function DashboardHome() {
  const { session } = useOutletContext()
  const { selectedTeam, currentUserRole, currentUserPermissions, permissionsLoading } = useTeams()
  const { prefs, loading: prefsLoading, savePrefs } = useDashboardPrefs(session?.user?.id, selectedTeam?.id)

  const [items, setItems] = useState(null)
  const [editing, setEditing] = useState(false)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [settingsId, setSettingsId] = useState(null)
  const teamId = selectedTeam?.id
  const itemsRef = useRef(null)
  const saveTimer = useRef(null)
  const pendingSave = useRef(null) // { items, teamId } — még ki nem írt változás
  const mounted = useRef(false)
  const loading = permissionsLoading || prefsLoading

  // Csapatváltáskor / betöltéskor a mentett (vagy alap) elrendezés.
  useEffect(() => {
    if (loading) return
    const next = normalizeLayout(prefs, currentUserRole, currentUserPermissions)
    itemsRef.current = next
    setItems(next)
    // A prefs a csapattal együtt változik; a szerkesztés közbeni mentések nem írják felül.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, teamId])

  // A függő mentést nem dobjuk el: csapatváltáskor, az oldal elhagyásakor és
  // böngészőzáráskor azonnal kiírjuk (a mentés csapata az ütemezéskori).
  const flushSave = () => {
    clearTimeout(saveTimer.current)
    const pending = pendingSave.current
    pendingSave.current = null
    if (pending) savePrefs(pending.items, pending.teamId)
  }
  const flushRef = useRef(flushSave)
  flushRef.current = flushSave

  useEffect(() => () => flushRef.current(), [teamId])
  useEffect(() => {
    mounted.current = true
    const onUnload = () => flushRef.current()
    window.addEventListener('beforeunload', onUnload)
    return () => {
      mounted.current = false
      window.removeEventListener('beforeunload', onUnload)
      flushRef.current()
    }
  }, [])

  const persist = (next) => {
    pendingSave.current = { items: next, teamId }
    clearTimeout(saveTimer.current)
    if (mounted.current) saveTimer.current = setTimeout(() => flushRef.current(), SAVE_DELAY_MS)
    else flushSave()
  }

  // A változás mindig a legfrissebb elrendezésből számol (a widgetek késleltetett
  // mentései régebbi renderből hívhatnak), így nem írják felül egymást.
  const change = (nextOrUpdater) => {
    const prev = itemsRef.current || []
    const next = typeof nextOrUpdater === 'function' ? nextOrUpdater(prev) : nextOrUpdater
    if (next === prev) return
    itemsRef.current = next
    setItems(next)
    persist(next)
  }

  const changeItemSettings = (id, patch) =>
    change((prev) =>
      prev.some((i) => i.id === id)
        ? prev.map((i) => (i.id === id ? { ...i, settings: { ...i.settings, ...patch } } : i))
        : prev
    )

  const shown = useMemo(() => visibleItems(items || [], currentUserPermissions), [items, currentUserPermissions])

  // A rács csak a látható elemekkel dolgozik; a rejtetteket a helyükön hagyjuk.
  const changeShown = (nextShown) => {
    const hidden = (items || []).filter((i) => !shown.some((s) => s.id === i.id))
    change([...nextShown, ...hidden])
  }

  const settingsItem = shown.find((i) => i.id === settingsId) ?? null

  const today = new Intl.DateTimeFormat('hu-HU', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <PageHeader
        title="Kezdőlap"
        description={today}
        actions={
          <>
            {editing && (
              <>
                <Button
                  icon={RotateCcw}
                  onClick={() => change(defaultLayout(currentUserRole, currentUserPermissions))}
                >
                  Alaphelyzet
                </Button>
                <Button icon={Plus} onClick={() => setCatalogOpen(true)}>
                  Widget hozzáadása
                </Button>
              </>
            )}
            <Button variant="primary" icon={editing ? Check : LayoutGrid} onClick={() => setEditing((e) => !e)}>
              {editing ? 'Kész' : 'Szerkesztés'}
            </Button>
          </>
        }
      />

      {editing && (
        <p className="mb-4 rounded-[10px] bg-accent-soft px-3 py-2 text-[12.5px] font-semibold text-accent">
          Szerkesztés: húzd a fogantyút, méretezd a sarokkal, a változás azonnal mentődik.
        </p>
      )}

      {loading || !items ? (
        <LoadingSpinner size="inline" />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={Settings}
          title="Üres a kezdőlapod"
          description="Adj hozzá widgeteket a katalógusból, vagy állítsd vissza az alap-elrendezést."
          actionLabel="Widget hozzáadása"
          onAction={() => {
            setEditing(true)
            setCatalogOpen(true)
          }}
        />
      ) : (
        <HomeGrid
          items={shown}
          components={WIDGET_COMPONENTS}
          editing={editing}
          onChange={changeShown}
          onItemSettings={changeItemSettings}
          onOpenSettings={setSettingsId}
        />
      )}

      <WidgetCatalog
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        items={items || []}
        permissions={currentUserPermissions}
        onAdd={(type) => change((prev) => addItem(prev, type))}
      />
      <WidgetSettings
        item={settingsItem}
        teamId={selectedTeam?.id}
        onClose={() => setSettingsId(null)}
        onChange={(patch) => change((prev) => prev.map((i) => (i.id === settingsId ? { ...i, ...patch } : i)))}
      />
    </div>
  )
}
