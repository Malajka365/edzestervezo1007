import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from './lib/supabase'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import JoinTeam from './pages/JoinTeam'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorBoundary from './components/ErrorBoundary'

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
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

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

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#ffffff',
            border: '1px solid #334155',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#1e293b',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#1e293b',
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
          />
          <Route path="/" element={<Navigate to={session ? "/dashboard" : "/auth"} replace />} />
        </Routes>
      </ErrorBoundary>
      </Router>
    </QueryClientProvider>
  )
}

export default App
