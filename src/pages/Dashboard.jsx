import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { TeamProvider, useTeams } from '../context/TeamContext'
import { DASHBOARD_MODULE_TO_PERMISSION_KEY, isModuleVisible } from '../lib/permissions'
import TeamSelector from '../components/TeamSelector'
import Teams from './Teams'
import Measurements from './Measurements'
import TrainingLoad from './TrainingLoad'
import Leaderboard from './Leaderboard'
import PlayerProgress from './PlayerProgress'
import Profile from './Profile'
import MacrocyclePlanner from './MacrocyclePlanner'
import Calendar from './Calendar'
import TrainingTemplates from './TrainingTemplates'
import Matches from './Matches'
import ExerciseLibrary from './ExerciseLibrary'
import Rehabilitation from './Rehabilitation'
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
  ChevronRight,
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
  const [activeModule, setActiveModule] = useState('home')
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
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        userRole={userRole}
        getRoleLabel={getRoleLabel}
        handleSignOut={handleSignOut}
      />
    </TeamProvider>
  )
}

function DashboardContent({
  session,
  sidebarOpen,
  setSidebarOpen,
  activeModule,
  setActiveModule,
  userRole,
  getRoleLabel,
  handleSignOut,
}) {
  const { currentUserPermissions, permissionsLoading } = useTeams()

  const modules = [
    {
      id: 'home',
      name: 'Dashboard',
      icon: Home,
      description: 'Főoldal és áttekintés',
      color: 'bg-blue-500',
    },
    {
      id: 'teams',
      name: 'Csapatok',
      icon: Users,
      description: 'Játékosok kezelése',
      color: 'bg-green-500',
    },
    {
      id: 'macrocycle',
      name: 'Makrociklus Tervező',
      icon: CalendarIcon,
      description: 'Éves edzésterv és periodizáció',
      color: 'bg-purple-500',
    },
    {
      id: 'calendar',
      name: 'Edzésnaptár',
      icon: CalendarDays,
      description: 'Interaktív naptár nézet',
      color: 'bg-indigo-500',
    },
    {
      id: 'exercises',
      name: 'Gyakorlat Könyvtár',
      icon: Dumbbell,
      description: 'Kondicionális gyakorlatok',
      color: 'bg-purple-600',
    },
    {
      id: 'templates',
      name: 'Edzéssablonok',
      icon: Clipboard,
      description: 'Újrafelhasználható programok',
      color: 'bg-teal-500',
    },
    {
      id: 'matches',
      name: 'Mérkőzések',
      icon: Medal,
      description: 'Mérkőzések és eredmények',
      color: 'bg-pink-500',
    },
    {
      id: 'measurement',
      name: 'Mérési modul',
      icon: BarChart3,
      description: 'Teljesítménymérések',
      color: 'bg-orange-500',
    },
    {
      id: 'trainingload',
      name: '1RM Kalkulátor',
      icon: Calculator,
      description: 'Terhelés százalékok',
      color: 'bg-cyan-500',
    },
    {
      id: 'leaderboard',
      name: 'Ranglista',
      icon: Trophy,
      description: 'Testsúly arányos erő',
      color: 'bg-yellow-500',
    },
    {
      id: 'progress',
      name: 'Progresszió',
      icon: TrendingUp,
      description: 'Játékos fejlődés követése',
      color: 'bg-green-500',
    },
    {
      id: 'rehab',
      name: 'Rehabilitáció',
      icon: Heart,
      description: 'Sérülések és gyógyulás',
      color: 'bg-red-500',
    },
  ]

  const visibleModules = permissionsLoading
    ? modules
    : modules.filter((module) => {
        const permissionKey = DASHBOARD_MODULE_TO_PERMISSION_KEY[module.id]
        return isModuleVisible(currentUserPermissions, permissionKey)
      })

  const activeModuleData = modules.find((m) => m.id === activeModule)

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
                    <button
                      onClick={() => {
                        setActiveModule(module.id)
                        setSidebarOpen(false)
                      }}
                      className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                        activeModule === module.id
                          ? 'bg-primary-600 text-white shadow-lg'
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm">{module.name}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* User Profile */}
          <div className="p-3 border-t border-slate-700">
            <button
              onClick={() => {
                setActiveModule('profile')
                setSidebarOpen(false)
              }}
              className="w-full flex items-center space-x-2 mb-2 p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
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
            </button>
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
        {/* Top Bar - always rendered so the mobile hamburger button is available on every module */}
        <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 py-4 gap-4 flex-wrap lg:flex-nowrap">
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-slate-300 hover:text-white flex-shrink-0"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-white">
                  {activeModuleData?.name}
                </h1>
                <p className="text-sm text-slate-400 hidden sm:block">{activeModuleData?.description}</p>
              </div>
            </div>

            {/* Team Selector - visible on all pages */}
            <div className="flex-shrink-0 w-full sm:w-auto order-3 lg:order-none">
              <TeamSelector />
            </div>
          </div>
        </header>

        {/* Content Area */}
        {activeModule === 'rehab' ? (
          <Rehabilitation />
        ) : activeModule === 'macrocycle' ? (
          <MacrocyclePlanner />
        ) : activeModule === 'teams' ? (
          <Teams />
        ) : activeModule === 'calendar' ? (
          <Calendar />
        ) : activeModule === 'measurement' ? (
          <Measurements session={session} />
        ) : activeModule === 'leaderboard' ? (
          <Leaderboard />
        ) : activeModule === 'exercises' ? (
          <ExerciseLibrary />
        ) : activeModule === 'templates' ? (
          <TrainingTemplates />
        ) : activeModule === 'matches' ? (
          <Matches />
        ) : activeModule === 'trainingload' ? (
          <TrainingLoad />
        ) : activeModule === 'progress' ? (
          <PlayerProgress />
        ) : activeModule === 'profile' ? (
          <main className="p-6">
            <Profile session={session} />
          </main>
        ) : (
          <main className="p-6">
            {activeModule === 'home' && (
              <div className="space-y-6">
                {/* Welcome Card */}
                <div className="card">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Üdvözöllek a TeamFlow-ban! 👋
                  </h2>
                  <p className="text-slate-300 mb-4">
                    Kezdj el dolgozni a csapatod menedzselésével. Válassz egy modult a bal oldali menüből.
                  </p>
                  <div className="flex items-center space-x-2 text-primary-400">
                    <span className="text-sm font-medium">
                      Bejelentkezve: {session.user.email}
                    </span>
                  </div>
                </div>

                {/* Quick Access Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {visibleModules.slice(1).map((module) => {
                    const Icon = module.icon
                    return (
                      <button
                        key={module.id}
                        onClick={() => setActiveModule(module.id)}
                        className="card hover:border-primary-500 transition-all duration-200 group text-left"
                      >
                        <div
                          className={`w-12 h-12 ${module.color} rounded-lg flex items-center justify-center mb-4`}
                        >
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary-400 transition-colors">
                          {module.name}
                        </h3>
                        <p className="text-sm text-slate-400 mb-3">{module.description}</p>
                        <div className="flex items-center text-primary-400 text-sm font-medium">
                          Megnyitás
                          <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Info Card */}
                <div className="card bg-gradient-to-r from-primary-900/30 to-purple-900/30 border-primary-700">
                  <h3 className="text-lg font-bold text-white mb-2">
                    🚀 Következő lépések
                  </h3>
                  <ul className="space-y-2 text-slate-300">
                    <li className="flex items-start">
                      <ChevronRight className="w-5 h-5 text-primary-400 mr-2 flex-shrink-0 mt-0.5" />
                      <span>Hozd létre az első csapatodat és add hozzá a játékosokat</span>
                    </li>
                    <li className="flex items-start">
                      <ChevronRight className="w-5 h-5 text-primary-400 mr-2 flex-shrink-0 mt-0.5" />
                      <span>Készíts edzéstervet és oszd meg a csapattal</span>
                    </li>
                    <li className="flex items-start">
                      <ChevronRight className="w-5 h-5 text-primary-400 mr-2 flex-shrink-0 mt-0.5" />
                      <span>Rögzítsd a játékosok mérési eredményeit</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {activeModule !== 'home' && (
              <div className="card text-center py-12">
                <div
                  className={`w-16 h-16 ${activeModuleData?.color} rounded-2xl flex items-center justify-center mx-auto mb-4`}
                >
                  {activeModuleData && <activeModuleData.icon className="w-8 h-8 text-white" />}
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {activeModuleData?.name}
                </h2>
                <p className="text-slate-400 mb-6 max-w-md mx-auto">
                  Ez a modul jelenleg fejlesztés alatt áll. Hamarosan elérhető lesz!
                </p>
                <div className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-700 rounded-lg text-slate-300 text-sm">
                  <span>🔨</span>
                  <span>Hamarosan...</span>
                </div>
              </div>
            )}
          </main>
        )}
      </div>
    </div>
  )
}
