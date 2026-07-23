import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Mail, Lock, UserPlus, LogIn, Loader2, Database } from 'lucide-react'
import SupabaseConnectionTest from '../components/SupabaseConnectionTest'

export default function Auth() {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [showConnectionTest, setShowConnectionTest] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Ha a felhasználó egy meghívó linken keresztül (`/join/:token`) érkezett
  // ide bejelentkezés/regisztráció végett, a JoinTeam oldal a tokent
  // sessionStorage-ban hagyta. Sikeres auth után egyből oda irányítjuk,
  // ahelyett hogy a App.jsx alapértelmezett /dashboard átirányítására
  // bíznánk (ami elveszítené a pending tokent).
  const redirectToPendingInviteIfAny = (session) => {
    const pendingToken = sessionStorage.getItem('pendingInviteToken')
    if (pendingToken && session) {
      sessionStorage.removeItem('pendingInviteToken')
      navigate(`/join/${pendingToken}`)
    }
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      if (isLogin) {
        // Bejelentkezés
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        setMessage({ type: 'success', text: 'Sikeres bejelentkezés!' })
        redirectToPendingInviteIfAny(data.session)
      } else {
        // Regisztráció
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        })

        if (error) throw error

        setMessage({
          type: 'success',
          text: 'Regisztráció sikeres! Ellenőrizd az email fiókodat a megerősítéshez.',
        })
        // Ha a Supabase projektben ki van kapcsolva az email megerősítés,
        // a signUp azonnal aktív session-t ad vissza - ilyenkor is
        // irányítsuk a felhasználót a függőben lévő meghívóra.
        redirectToPendingInviteIfAny(data.session)
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Hiba történt. Próbáld újra!',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Connection Test Toggle */}
        <div className="text-center mb-4 px-2">
          <button
            onClick={() => setShowConnectionTest(!showConnectionTest)}
            className="text-sm text-slate-400 hover:text-primary-400 transition-colors inline-flex items-center mx-auto"
          >
            <Database className="w-4 h-4 mr-2 flex-shrink-0" />
            {showConnectionTest ? 'Kapcsolat teszt elrejtése' : 'Adatbázis kapcsolat tesztelése'}
          </button>
        </div>

        {/* Connection Test Component */}
        {showConnectionTest && (
          <div className="mb-6">
            <SupabaseConnectionTest />
          </div>
        )}

      <div className="w-full max-w-md mx-auto">
        {/* Logo & Title */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-primary-600 rounded-2xl mb-4">
            <span className="text-2xl sm:text-3xl font-bold text-white">TF</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">TeamFlow</h1>
          <p className="text-sm sm:text-base text-slate-400">Csapatsport Edzés Menedzsment</p>
        </div>

        {/* Auth Card */}
        <div className="card">
          <div className="flex mb-6 bg-slate-700 rounded-lg p-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 px-2 sm:px-4 rounded-md text-sm sm:text-base font-semibold transition-all duration-200 ${
                isLogin
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4 inline mr-1 sm:mr-2" />
              Bejelentkezés
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 px-2 sm:px-4 rounded-md text-sm sm:text-base font-semibold transition-all duration-200 ${
                !isLogin
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4 inline mr-1 sm:mr-2" />
              Regisztráció
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email cím
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pelda@email.com"
                required
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                <Lock className="w-4 h-4 inline mr-2" />
                Jelszó
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="input-field"
              />
              {!isLogin && (
                <p className="text-xs text-slate-400 mt-1">
                  Minimum 6 karakter hosszú jelszó szükséges
                </p>
              )}
            </div>

            {message.text && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  message.type === 'success'
                    ? 'bg-green-900/50 text-green-300 border border-green-700'
                    : 'bg-red-900/50 text-red-300 border border-red-700'
                }`}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Feldolgozás...
                </>
              ) : isLogin ? (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Bejelentkezés
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" />
                  Regisztráció
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-6 text-sm text-slate-400">
          <p>
            {isLogin ? 'Még nincs fiókod?' : 'Már van fiókod?'}{' '}
            <button
              onClick={() => {
                setIsLogin(!isLogin)
                setMessage({ type: '', text: '' })
              }}
              className="text-primary-400 hover:text-primary-300 font-semibold transition-colors"
            >
              {isLogin ? 'Regisztrálj most' : 'Jelentkezz be'}
            </button>
          </p>
        </div>
      </div>
      </div>
    </div>
  )
}
