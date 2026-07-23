import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { supabase } from './lib/supabase'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import JoinTeam from './pages/JoinTeam'
import LoadingSpinner from './components/LoadingSpinner'

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
    </Router>
  )
}

export default App
