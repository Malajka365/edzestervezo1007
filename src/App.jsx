import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
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
      <Routes>
        <Route
          path="/auth"
          element={!session ? <Auth /> : <Navigate to="/dashboard" replace />}
        />
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
