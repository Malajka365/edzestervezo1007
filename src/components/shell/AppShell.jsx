import { Suspense, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useTeams } from '../../context/TeamContext'
import { PROFILE_ITEM } from '../../lib/navigation'
import LoadingSpinner from '../LoadingSpinner'
import Drawer from '../ui/Drawer'
import IconButton from '../ui/IconButton'
import NoTeamState from './NoTeamState'
import Sidebar from './Sidebar'
import TeamSwitcher from './TeamSwitcher'

export default function AppShell({ session }) {
  const { teams, loading } = useTeams()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const isProfileRoute = location.pathname.replace(/\/+$/, '') === PROFILE_ITEM.path
  const showNoTeam = teams.length === 0 && !loading && !isProfileRoute

  return (
    <div className="flex h-screen bg-bg text-fg">
      <Sidebar session={session} className="hidden w-[248px] lg:flex" />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Ideiglenes mobil fejléc: a Task 5 váltja le a MobileTopBar / BottomTabBar / MoreSheet
            hármasra. Addig ez teszi elérhetővé a menüt és a csapatváltót lg alatt. */}
        <header className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2 lg:hidden">
          <IconButton icon={Menu} label="Menü megnyitása" onClick={() => setMenuOpen(true)} />
          <div className="min-w-0 flex-1">
            <TeamSwitcher compact />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          {showNoTeam ? (
            <NoTeamState />
          ) : (
            <Suspense fallback={<LoadingSpinner size="inline" />}>
              <Outlet context={{ session }} />
            </Suspense>
          )}
        </main>
      </div>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} title="Menü" side="left">
        <Sidebar
          session={session}
          onNavigate={() => setMenuOpen(false)}
          className="-m-4 border-r-0"
        />
      </Drawer>
    </div>
  )
}
