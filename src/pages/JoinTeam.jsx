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
      const { data, error } = await supabase
        .from('team_invites')
        .select('id, team_id, role, expires_at, used_at, teams(name)')
        .eq('token', token)
        .single()

      if (error || !data) {
        setStatus('error')
        setErrorMessage('A meghívó link érvénytelen.')
        return
      }
      if (data.used_at) {
        setStatus('error')
        setErrorMessage('Ezt a meghívót már felhasználták.')
        return
      }
      if (new Date(data.expires_at) < new Date()) {
        setStatus('error')
        setErrorMessage('A meghívó link lejárt.')
        return
      }

      setInvite(data)
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
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({ team_id: invite.team_id, user_id: session.user.id, role: invite.role })

      if (memberError) throw memberError

      const { error: inviteError } = await supabase
        .from('team_invites')
        .update({ used_at: new Date().toISOString(), used_by: session.user.id })
        .eq('id', invite.id)

      if (inviteError) throw inviteError

      setStatus('success')
      setTimeout(() => navigate('/dashboard'), 1500)
    } catch (error) {
      console.error('Error accepting invite:', error)
      setStatus('error')
      setErrorMessage('Hiba történt a csatlakozás során. Lehet, hogy már tagja vagy ennek a csapatnak.')
    }
  }

  const roleLabel = (roleKey) => ROLES.find((r) => r.key === roleKey)?.name || roleKey

  if (status === 'loading' || status === 'joining') return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="card max-w-md w-full text-center">
        {status === 'confirm' && invite && (
          <>
            <h2 className="text-xl font-bold text-white mb-2">Csapat meghívó</h2>
            <p className="text-slate-300 mb-6">
              Csatlakozol a(z) <strong>{invite.teams.name}</strong> csapathoz mint{' '}
              <strong>{roleLabel(invite.role)}</strong>?
            </p>
            <button onClick={handleAccept} className="btn btn-primary w-full">
              Csatlakozás
            </button>
          </>
        )}
        {status === 'success' && <p className="text-green-400">Sikeres csatlakozás! Átirányítás...</p>}
        {status === 'error' && <p className="text-red-400">{errorMessage}</p>}
      </div>
    </div>
  )
}
