import { useState, useEffect, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from './lib/supabase'
import { useTheme } from './hooks/useTheme'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import JoinTeam from './pages/JoinTeam'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorBoundary from './components/ErrorBoundary'
import Button from './components/ui/Button'
import Panel from './components/ui/Panel'

// Dashboard module routes — lazy-loaded; one <Suspense> around the layout's
// <Outlet> (in Dashboard.jsx) catches all of these.
const DashboardHome = lazy(() => import('./pages/DashboardHome'))
const Teams = lazy(() => import('./pages/Teams'))
const MacrocyclePlanner = lazy(() => import('./pages/MacrocyclePlanner'))
const Calendar = lazy(() => import('./pages/Calendar'))
const ExerciseLibrary = lazy(() => import('./pages/ExerciseLibrary'))
const TrainingTemplates = lazy(() => import('./pages/TrainingTemplates'))
const Matches = lazy(() => import('./pages/Matches'))
const Measurements = lazy(() => import('./pages/Measurements'))
const TrainingLoad = lazy(() => import('./pages/TrainingLoad'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))
const PlayerProgress = lazy(() => import('./pages/PlayerProgress'))
const Rehabilitation = lazy(() => import('./pages/Rehabilitation'))
const Profile = lazy(() => import('./pages/Profile'))

// Module-scoped QueryClient — created once for the app's lifetime so the cache
// survives module (route) switches. Sane defaults for a team-management app:
// the roster rarely changes mid-session, so cache stays fresh for 5 minutes and
// we don't refetch just because the window regained focus.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  // A téma az egész appra érvényes (Auth, csatlakozás, irányítópult): itt él a
  // rendszer-téma követése, a kapcsoló (UserMenu) csak módot vált.
  useTheme({ apply: true })
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [connError, setConnError] = useState(null)

  useEffect(() => {
    // Get initial session. Ha a backend nem érhető el (leállított/törölt Supabase
    // projekt, hálózati hiba), a promise elhasal — .catch nélkül a `loading` örökre
    // igaz maradna, és az app a töltő-spinneren ragadna.
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session)
      })
      .catch((err) => {
        console.error('Nem sikerült lekérni a munkamenetet:', err)
        setConnError(err)
      })
      .finally(() => setLoading(false))

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <LoadingSpinner />
  }

  // A backend nem válaszolt: egyértelmű hibaképernyő a végtelen spinner helyett.
  if (connError) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <Panel className="max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-fg mb-2">Nem érhető el a szerver</h1>
          <p className="text-muted mb-6">
            Az alkalmazás nem tudott csatlakozni az adatbázishoz. Ellenőrizd az
            internetkapcsolatot és a Supabase projekt állapotát (VITE_SUPABASE_URL).
          </p>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Újratöltés
          </Button>
        </Panel>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgb(var(--surface))',
            color: 'rgb(var(--fg))',
            border: '1px solid rgb(var(--line))',
          },
          success: {
            iconTheme: {
              primary: 'rgb(var(--ok))',
              secondary: 'rgb(var(--surface))',
            },
          },
          error: {
            iconTheme: {
              primary: 'rgb(var(--bad))',
              secondary: 'rgb(var(--surface))',
            },
          },
        }}
      />
      <ErrorBoundary>
        <Routes>
          <Route
            path="/auth"
            element={!session ? <Auth /> : <Navigate to="/dashboard" replace />}
          />
          <Route path="/join/:token" element={<JoinTeam session={session} />} />
          <Route
            path="/dashboard"
            element={session ? <Dashboard session={session} /> : <Navigate to="/auth" replace />}
          >
            <Route index element={<DashboardHome />} />
            <Route path="csapatok" element={<Teams />} />
            <Route path="makrociklus" element={<MacrocyclePlanner />} />
            <Route path="naptar" element={<Calendar />} />
            <Route path="gyakorlatok" element={<ExerciseLibrary />} />
            <Route path="sablonok" element={<TrainingTemplates />} />
            <Route path="merkozesek" element={<Matches />} />
            <Route path="meresek" element={<Measurements session={session} />} />
            <Route path="kalkulator" element={<TrainingLoad />} />
            <Route path="ranglista" element={<Leaderboard />} />
            <Route path="progresszio" element={<PlayerProgress />} />
            <Route path="rehabilitacio" element={<Rehabilitation />} />
            <Route
              path="profil"
              element={<Profile session={session} />}
            />
            {/* Unknown /dashboard/* slug → back to the dashboard home */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
          <Route path="/" element={<Navigate to={session ? "/dashboard" : "/auth"} replace />} />
        </Routes>
      </ErrorBoundary>
      </Router>
    </QueryClientProvider>
  )
}

export default App
