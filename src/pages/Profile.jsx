import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  User,
  Mail,
  Lock,
  Save,
  X,
  Shield,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react'

export default function Profile({ session }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [showPasswordFields, setShowPasswordFields] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    role: 'coach',
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (error) throw error

      if (data) {
        setProfileForm({
          full_name: data.full_name || '',
          role: data.role || 'coach',
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name,
          role: profileForm.role,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Profil sikeresen frissítve!' })
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ type: 'error', text: 'Hiba történt a profil frissítésekor' })
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    // Validation
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Az új jelszavak nem egyeznek!' })
      setLoading(false)
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'A jelszónak legalább 6 karakter hosszúnak kell lennie!' })
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      })

      if (error) throw error

      setMessage({ type: 'success', text: 'Jelszó sikeresen megváltoztatva!' })
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setShowPasswordFields(false)
    } catch (error) {
      console.error('Error changing password:', error)
      setMessage({ type: 'error', text: error.message || 'Hiba történt a jelszó változtatásakor' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Profil Beállítások</h2>
        <p className="text-slate-400 text-sm mt-1">
          Kezeld a fiókod adatait és biztonsági beállításait
        </p>
      </div>

      {/* Message */}
      {message.text && (
        <div
          className={`flex items-center space-x-2 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-900/30 border border-green-700 text-green-300'
              : 'bg-red-900/30 border border-red-700 text-red-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          )}
          <p className="text-sm">{message.text}</p>
          <button
            onClick={() => setMessage({ type: '', text: '' })}
            className="ml-auto text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Profile Information Card */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Profil Információk</h3>
            <p className="text-sm text-slate-400">Frissítsd a személyes adataidat</p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email cím
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={session.user.email}
                disabled
                className="input-field pl-10 bg-slate-700 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">Az email cím nem változtatható</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Teljes név
            </label>
            <input
              type="text"
              value={profileForm.full_name}
              onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
              className="input-field"
              placeholder="pl. Kiss János"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Titulus / Szerepkör
            </label>
            <select
              value={profileForm.role}
              onChange={(e) => setProfileForm({ ...profileForm, role: e.target.value })}
              className="input-field"
            >
              <option value="coach">Edző</option>
              <option value="fitness_coach">Erőnléti edző</option>
              <option value="physiotherapist">Fizioterapeuta</option>
            </select>
          </div>

          <div className="flex items-center space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{loading ? 'Mentés...' : 'Profil Mentése'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Security Card */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Biztonság</h3>
            <p className="text-sm text-slate-400">Jelszó és biztonsági beállítások</p>
          </div>
        </div>

        {!showPasswordFields ? (
          <button
            onClick={() => setShowPasswordFields(true)}
            className="btn-secondary flex items-center space-x-2"
          >
            <Lock className="w-5 h-5" />
            <span>Jelszó Megváltoztatása</span>
          </button>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Jelenlegi jelszó
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                  }
                  className="input-field pl-10 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Új jelszó
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                  }
                  required
                  className="input-field pl-10 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Legalább 6 karakter</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Új jelszó megerősítése
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                  }
                  required
                  className="input-field pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                <span>{loading ? 'Mentés...' : 'Jelszó Mentése'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordFields(false)
                  setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                  })
                }}
                className="btn-secondary"
              >
                Mégse
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Account Info */}
      <div className="card">
        <h3 className="text-lg font-bold text-white mb-4">Fiók Információk</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-slate-700">
            <span className="text-slate-400">Fiók létrehozva</span>
            <span className="text-white">
              {new Date(session.user.created_at).toLocaleDateString('hu-HU')}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-700">
            <span className="text-slate-400">Utolsó bejelentkezés</span>
            <span className="text-white">
              {session.user.last_sign_in_at
                ? new Date(session.user.last_sign_in_at).toLocaleDateString('hu-HU')
                : 'N/A'}
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-400">Felhasználó ID</span>
            <span className="text-white font-mono text-xs">{session.user.id.slice(0, 8)}...</span>
          </div>
        </div>
      </div>
    </div>
  )
}
