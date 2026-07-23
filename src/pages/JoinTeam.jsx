import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ROLES } from '../lib/permissions'
import LoadingSpinner from '../components/LoadingSpinner'

export default function JoinTeam({ session }) {
  const { token } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading') // loading | confirm | joining | success | error
  const [invite, setInvite] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!session) {
      // Nincs bejelentkezve: irányítsuk az Auth oldalra, a token megőrzésével
      sessionStorage.setItem('pendingInviteToken', token)
      navigate('/auth')
      return
    }
    fetchInvite()
  }, [session])

  const fetchInvite = async () => {
    try {
      const { data, error } = await supabase.rpc('get_invite_by_token', { p_token: token })
      const row = data?.[0]

      if (error || !row) {
        setStatus('error')
        setErrorMessage('A meghívó link érvénytelen.')
        return
      }
      if (row.used_at) {
        setStatus('error')
        setErrorMessage('Ezt a meghívót már felhasználták.')
        return
      }
      if (new Date(row.expires_at) < new Date()) {
        setStatus('error')
        setErrorMessage('A meghívó link lejárt.')
        return
      }

      setInvite(row)
      setStatus('confirm')
    } catch (error) {
      console.error('Error fetching invite:', error)
      setStatus('error')
      setErrorMessage('Hiba történt a meghívó betöltésekor.')
    }
  }

  const handleAccept = async () => {
    setStatus('joining')
    try {
      const { error } = await supabase.rpc('redeem_team_invite', { p_token: token })

      if (error) throw error

      setStatus('success')
      setTimeout(() => navigate('/dashboard'), 1500)
    } catch (error) {
      console.error('Error accepting invite:', error)
      setStatus('error')
      const message = error?.message || ''
      if (message.includes('invite_wrong_email')) {
        setErrorMessage('Ez a meghívó egy másik e-mail címhez tartozik. Azzal a fiókkal jelentkezz be, amelyik a meghívót kapta.')
      } else if (message.includes('invite_already_used')) {
        setErrorMessage('Ezt a meghívót már felhasználták.')
      } else if (message.includes('invite_expired')) {
        setErrorMessage('A meghívó link lejárt.')
      } else if (message.includes('invalid_invite')) {
        setErrorMessage('A meghívó link érvénytelen.')
      } else {
        setErrorMessage('Hiba történt a csatlakozás során. Lehet, hogy már tagja vagy ennek a csapatnak.')
      }
    }
  }

  const roleLabel = (roleKey) => ROLES.find((r) => r.key === roleKey)?.name || roleKey

  // Kliensoldali korai visszajelzés: ha a meghívó e-mail címhez kötött és a
  // bejelentkezett felhasználó e-mail címe nem egyezik, ne engedjük a
  // csatlakozást. A szerver (redeem_team_invite) ettől függetlenül is ellenőrzi.
  const userEmail = session?.user?.email || ''
  const emailMismatch =
    !!invite?.invited_email &&
    invite.invited_email.toLowerCase() !== userEmail.toLowerCase()

  if (status === 'loading' || status === 'joining') return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="card max-w-md w-full text-center p-5 sm:p-6">
        {status === 'confirm' && invite && (
          <>
            <h2 className="text-lg sm:text-xl font-bold text-white mb-2">Csapat meghívó</h2>
            <p className="text-sm sm:text-base text-slate-300 mb-4 break-words">
              Csatlakozol a(z) <strong>{invite.team_name}</strong> csapathoz mint{' '}
              <strong>{roleLabel(invite.role)}</strong>?
            </p>
            {invite.invited_email && (
              <p className="text-xs sm:text-sm text-slate-400 mb-6 break-words">
                A meghívó ehhez az e-mail címhez kötött: <strong>{invite.invited_email}</strong>
              </p>
            )}
            {emailMismatch ? (
              <p className="text-sm sm:text-base text-red-400">
                Ez a meghívó egy másik e-mail címhez tartozik. Azzal a fiókkal jelentkezz be, amelyik a meghívót kapta.
              </p>
            ) : (
              <button onClick={handleAccept} className="btn btn-primary w-full">
                Csatlakozás
              </button>
            )}
          </>
        )}
        {status === 'success' && <p className="text-sm sm:text-base text-green-400">Sikeres csatlakozás! Átirányítás...</p>}
        {status === 'error' && <p className="text-sm sm:text-base text-red-400">{errorMessage}</p>}
      </div>
    </div>
  )
}
