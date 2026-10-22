import { Suspense, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useTeams } from '../../context/TeamContext'
import { useHotkey } from '../../hooks/useHotkey'
import { hasOpenOverlay } from '../ui/useOverlay'
import { PROFILE_ITEM } from '../../lib/navigation'
import LoadingSpinner from '../LoadingSpinner'
import BottomTabBar, { BOTTOM_BAR_PADDING } from './BottomTabBar'
import CommandPalette from './CommandPalette'
import MobileTopBar from './MobileTopBar'
import MoreSheet from './MoreSheet'
import NoTeamState from './NoTeamState'
import Sidebar from './Sidebar'
import TeamsErrorState from './TeamsErrorState'

export default function AppShell({ session }) {
  const { teams, loading, teamsError, fetchTeams } = useTeams()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Nyitott űrlap-modal fölé nem nyitunk palettát: a navigáció elvetné a beírt adatot.
  useHotkey('mod+k', () => {
    if (!hasOpenOverlay()) setPaletteOpen(true)
  })

  const isProfileRoute = location.pathname.replace(/\/+$/, '') === PROFILE_ITEM.path
  const showNoTeam = teams.length === 0 && !loading && !isProfileRoute

  return (
    // h-screen tartalék a dvh-t nem ismerő böngészőknek; a dvh követi a mobil címsor mozgását.
    <div className="flex h-screen bg-bg supports-[height:100dvh]:h-dvh text-fg">
      <Sidebar session={session} onOpenPalette={() => setPaletteOpen(true)} className="hidden w-[248px] lg:flex" />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar onOpenPalette={() => setPaletteOpen(true)} />

        <main className={`min-h-0 flex-1 overflow-y-auto lg:pb-0 ${BOTTOM_BAR_PADDING}`}>
          {showNoTeam ? (
            teamsError ? <TeamsErrorState onRetry={fetchTeams} /> : <NoTeamState />
          ) : (
            <Suspense fallback={<LoadingSpinner size="inline" />}>
              <Outlet context={{ session }} />
            </Suspense>
          )}
        </main>
      </div>

      <BottomTabBar moreOpen={moreOpen} onOpenMore={() => setMoreOpen(true)} />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} session={session} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
