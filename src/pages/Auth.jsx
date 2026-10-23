import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { UserPlus, LogIn, CalendarDays, Activity, Users } from 'lucide-react'
import Button from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import SegmentedControl from '../components/ui/SegmentedControl'

const AUTH_TABS = [
  { id: 'login', label: 'Bejelentkezés', icon: LogIn },
  { id: 'register', label: 'Regisztráció', icon: UserPlus },
]

const BRAND_POINTS = [
  { icon: CalendarDays, text: 'Edzéstervezés és naptár' },
  { icon: Activity, text: 'Mérések és terhelés követése' },
  { icon: Users, text: 'Csapat és játékosok egy helyen' },
]

export default function Auth() {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const MIN_REGISTER_PASSWORD_LENGTH = 10

  // Egyszerű, kliens-oldali jelszó-erősség heurisztika (csak a regisztrációs
  // fülön jelenik meg). Pontszám: hossz >= 10, kis- és nagybetű keveréke,
  // számjegy vagy szimbólum jelenléte - mindegyik 1 pontot ér.
  const getPasswordStrength = (value) => {
    let score = 0
    if (value.length >= MIN_REGISTER_PASSWORD_LENGTH) score += 1
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1
    if (/[0-9]/.test(value) || /[^a-zA-Z0-9]/.test(value)) score += 1
    return score
  }

  const passwordStrength = getPasswordStrength(password)
  const strengthConfig = {
    0: { label: '', color: 'bg-surface-3', text: '' },
    1: { label: 'Gyenge', color: 'bg-bad', text: 'text-bad' },
    2: { label: 'Közepes', color: 'bg-warn', text: 'text-warn' },
    3: { label: 'Erős', color: 'bg-ok', text: 'text-ok' },
  }[passwordStrength]

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
        // Regisztráció - a szerver-oldali (Supabase) minimum ettől
        // függetlenül is érvényesítve van, de kliens-oldalon is
        // kikényszerítjük, hogy korai visszajelzést adjunk.
        if (password.length < MIN_REGISTER_PASSWORD_LENGTH) {
          setMessage({
            type: 'error',
            text: 'A jelszónak legalább 10 karakter hosszúnak kell lennie',
          })
          setLoading(false)
          return
        }

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
    <div className="min-h-screen bg-bg text-fg lg:grid lg:grid-cols-2">
      {/* Márkapanel: csak lg-től */}
      <aside className="hidden flex-col justify-between border-r border-line bg-surface p-12 lg:flex">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent font-display text-xl font-bold text-accent-fg">
          TF
        </span>

        <div>
          <p className="font-display text-7xl font-bold uppercase leading-none tracking-wide text-fg">
            TeamFlow
          </p>
          <p className="mt-4 max-w-sm text-lg text-muted">Csapatsport Edzés Menedzsment</p>
          <ul className="mt-10 space-y-4">
            {BRAND_POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-muted">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] bg-accent-soft text-accent">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <span aria-hidden="true" />
      </aside>

      <main className="flex min-h-screen items-center justify-center p-4 sm:p-8 lg:min-h-0">
        <div className="w-full max-w-md">
          {/* Márka fejléc a márkapanel helyett (lg alatt) */}
          <div className="mb-6 text-center sm:mb-8 lg:hidden">
            <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent font-display text-2xl font-bold text-accent-fg">
              TF
            </span>
            <h1 className="mb-2 font-display text-4xl font-bold uppercase tracking-wide text-fg">
              TeamFlow
            </h1>
            <p className="text-sm text-muted sm:text-base">Csapatsport Edzés Menedzsment</p>
          </div>

          <div className="rounded-[14px] border border-line bg-surface p-5 sm:p-6">
            <SegmentedControl
              label="Bejelentkezés vagy regisztráció"
              className="mb-6 flex w-full [&>button]:flex-1 [&>button]:justify-center"
              items={AUTH_TABS}
              value={isLogin ? 'login' : 'register'}
              onChange={(id) => setIsLogin(id === 'login')}
            />

            <form onSubmit={handleAuth} className="space-y-4">
              <Field label="Email cím" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pelda@email.com"
                  required
                />
              </Field>

              <div>
                <Field
                  label="Jelszó"
                  htmlFor="password"
                  hint={isLogin ? undefined : 'Minimum 10 karakter hosszú jelszó szükséges'}
                >
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={isLogin ? undefined : MIN_REGISTER_PASSWORD_LENGTH}
                  />
                </Field>
                {!isLogin && password && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((segment) => (
                        <div
                          key={segment}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            segment <= passwordStrength ? strengthConfig.color : 'bg-surface-3'
                          }`}
                        />
                      ))}
                    </div>
                    {strengthConfig.label && (
                      <p className={`mt-1 text-xs ${strengthConfig.text}`}>{strengthConfig.label}</p>
                    )}
                  </div>
                )}
              </div>

              {message.text && (
                <div
                  role={message.type === 'success' ? 'status' : 'alert'}
                  className={`rounded-[9px] border p-3 text-sm ${
                    message.type === 'success'
                      ? 'border-ok/40 bg-ok-soft text-ok'
                      : 'border-bad/40 bg-bad-soft text-bad'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                loading={loading}
                icon={isLogin ? LogIn : UserPlus}
              >
                {loading ? 'Feldolgozás...' : isLogin ? 'Bejelentkezés' : 'Regisztráció'}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-muted">
            {isLogin ? 'Még nincs fiókod?' : 'Már van fiókod?'}{' '}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                setMessage({ type: '', text: '' })
              }}
              className="rounded font-semibold text-accent transition-colors hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {isLogin ? 'Regisztrálj most' : 'Jelentkezz be'}
            </button>
          </p>
        </div>
      </main>
    </div>
  )
}
