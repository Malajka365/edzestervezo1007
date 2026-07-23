import { useNavigate, useOutletContext } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

// Index route content for /dashboard: welcome card, quick-access grid, next steps.
// Receives `session` and the permission-filtered `visibleModules` (each carrying
// its route `path`) from the Dashboard layout via <Outlet context>.
export default function DashboardHome() {
  const { session, visibleModules } = useOutletContext()
  const navigate = useNavigate()

  return (
    <main className="p-6">
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
          {visibleModules
            .filter((module) => module.id !== 'home')
            .map((module) => {
              const Icon = module.icon
              return (
                <button
                  key={module.id}
                  onClick={() => navigate(module.path)}
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
    </main>
  )
}
