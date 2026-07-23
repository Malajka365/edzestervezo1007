import { useState, useEffect, Suspense } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { TeamProvider, useTeams } from '../context/TeamContext'
import { DASHBOARD_MODULE_TO_PERMISSION_KEY, isModuleVisible } from '../lib/permissions'
import LoadingSpinner from '../components/LoadingSpinner'
import {
  Home,
  Users,
  Calendar as CalendarIcon,
  BarChart3,
  Heart,
  LogOut,
  Menu,
  X,
  User,
  Calculator,
  Trophy,
  TrendingUp,
  CalendarDays,
  Clipboard,
  Medal,
  Dumbbell,
} from 'lucide-react'

export default function Dashboard({ session }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userRole, setUserRole] = useState('coach')

  useEffect(() => {
    fetchUserProfile()

    // Listen for profile updates
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${session.user.id}`,
        },
        (payload) => {
          if (payload.new.role) {
            setUserRole(payload.new.role)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (error) throw error
      if (data) {
        setUserRole(data.role || 'coach')
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const getRoleLabel = (role) => {
    const roleLabels = {
      coach: 'Edző',
      fitness_coach: 'Erőnléti edző',
      physiotherapist: 'Fizioterapeuta',
    }
    return roleLabels[role] || 'Edző'
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <TeamProvider session={session}>
      <DashboardContent
        session={session}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        userRole={userRole}
        getRoleLabel={getRoleLabel}
        handleSignOut={handleSignOut}
      />
    </TeamProvider>
  )
}

// Module registry: `path` is the real URL for each module (used by the sidebar
// NavLinks, the header title lookup and the home quick-access grid).
const modules = [
  {
    id: 'home',
    name: 'Dashboard',
    icon: Home,
    description: 'Főoldal és áttekintés',
    color: 'bg-blue-500',
    path: '/dashboard',
  },
  {
    id: 'teams',
    name: 'Csapatok',
    icon: Users,
    description: 'Játékosok kezelése',
    color: 'bg-blue-500',
    path: '/dashboard/csapatok',
  },
  {
    id: 'macrocycle',
    name: 'Makrociklus Tervező',
    icon: CalendarIcon,
    description: 'Éves edzésterv és periodizáció',
    color: 'bg-purple-500',
    path: '/dashboard/makrociklus',
  },
  {
    id: 'calendar',
    name: 'Edzésnaptár',
    icon: CalendarDays,
    description: 'Interaktív naptár nézet',
    color: 'bg-purple-500',
    path: '/dashboard/naptar',
  },
  {
    id: 'exercises',
    name: 'Gyakorlat Könyvtár',
    icon: Dumbbell,
    description: 'Kondicionális gyakorlatok',
    color: 'bg-purple-500',
    path: '/dashboard/gyakorlatok',
  },
  {
    id: 'templates',
    name: 'Edzéssablonok',
    icon: Clipboard,
    description: 'Újrafelhasználható programok',
    color: 'bg-purple-500',
    path: '/dashboard/sablonok',
  },
  {
    id: 'matches',
    name: 'Mérkőzések',
    icon: Medal,
    description: 'Mérkőzések és eredmények',
    color: 'bg-purple-500',
    path: '/dashboard/merkozesek',
  },
  {
    id: 'measurement',
    name: 'Mérési modul',
    icon: BarChart3,
    description: 'Teljesítménymérések',
    color: 'bg-emerald-500',
    path: '/dashboard/meresek',
  },
  {
    id: 'trainingload',
    name: '1RM Kalkulátor',
    icon: Calculator,
    description: 'Terhelés százalékok',
    color: 'bg-emerald-500',
    path: '/dashboard/kalkulator',
  },
  {
    id: 'leaderboard',
    name: 'Ranglista',
    icon: Trophy,
    description: 'Testsúly arányos erő',
    color: 'bg-emerald-500',
    path: '/dashboard/ranglista',
  },
  {
    id: 'progress',
    name: 'Progresszió',
    icon: TrendingUp,
    description: 'Játékos fejlődés követése',
    color: 'bg-emerald-500',
    path: '/dashboard/progresszio',
  },
  {
    id: 'rehab',
    name: 'Rehabilitáció',
    icon: Heart,
    description: 'Sérülések és gyógyulás',
    color: 'bg-red-500',
    path: '/dashboard/rehabilitacio',
  },
]

// Profile is reachable via its own URL but isn't a sidebar module; keep its
// metadata here so the header can show a title on /dashboard/profil.
const profileModule = {
  id: 'profile',
  name: 'Profil',
  description: 'Fiók és beállítások',
  path: '/dashboard/profil',
}

function DashboardContent({
  session,
  sidebarOpen,
  setSidebarOpen,
  userRole,
  getRoleLabel,
  handleSignOut,
}) {
  const { currentUserPermissions, permissionsLoading } = useTeams()
  const location = useLocation()

  const visibleModules = permissionsLoading
    ? modules
    : modules.filter((module) => {
        const permissionKey = DASHBOARD_MODULE_TO_PERMISSION_KEY[module.id]
        return isModuleVisible(currentUserPermissions, permissionKey)
      })

  // Derive the current module from the URL for the header title/description.
  const currentModule =
    [...modules, profileModule].find((m) => m.path === location.pathname) || modules[0]

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Sidebar - Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-slate-800 border-r border-slate-700 transform transition-transform duration-300 ease-in-out z-50 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-base font-bold text-white">TF</span>
                </div>
                <div>
                  <h2 className="text-white font-bold text-sm">TeamFlow</h2>
                  <p className="text-xs text-slate-400">Edzés Menedzsment</p>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 min-h-0 overflow-y-auto p-3">
            <ul className="space-y-1">
              {visibleModules.map((module) => {
                const Icon = module.icon
                return (
                  <li key={module.id}>
                    <NavLink
                      to={module.path}
                      end={module.id === 'home'}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `w-full flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                          isActive
                            ? 'bg-primary-600 text-white shadow-lg'
                            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm">{module.name}</span>
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* User Profile */}
          <div className="p-3 border-t border-slate-700">
            <NavLink
              to={profileModule.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `w-full flex items-center space-x-2 mb-2 p-1.5 rounded-lg transition-colors ${
                  isActive ? 'bg-slate-700' : 'hover:bg-slate-700'
                }`
              }
            >
              <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-slate-300" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-medium text-white truncate">
                  {session.user.email}
                </p>
                <p className="text-xs text-slate-400">{getRoleLabel(userRole)}</p>
              </div>
            </NavLink>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center space-x-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs font-medium">Kijelentkezés</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-72">
        {/* Mobile-only top bar: hamburger + module name. On desktop (lg+) each
            module renders its own header (title + team selector + actions), so
            this bar is hidden there to avoid a duplicated header row. */}
        <header className="lg:hidden bg-slate-800 border-b border-slate-700 sticky top-0 z-30">
          <div className="flex items-center gap-4 px-4 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-300 hover:text-white flex-shrink-0"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-white truncate">
              {currentModule?.name}
            </h1>
          </div>
        </header>

        {/* Content Area - nested module routes render here via <Outlet>.
            One Suspense wraps the Outlet so it covers every lazy module. */}
        <Suspense fallback={<LoadingSpinner />}>
          <Outlet context={{ session, visibleModules }} />
        </Suspense>
      </div>
    </div>
  )
}
