import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { User, Lock, Save, Shield, Eye, EyeOff, IdCard } from 'lucide-react'
import Button from '../components/ui/Button'
import IconButton from '../components/ui/IconButton'
import Panel from '../components/ui/Panel'
import PageHeader from '../components/ui/PageHeader'
import { Field, Input, Select } from '../components/ui/Field'

// Jelszó mező bal oldali zár ikonnal és (opcionálisan) megjelenítés-kapcsolóval.
function PasswordInput({ id, value, onChange, required, show, onToggleShow, ...props }) {
  return (
    <div className="relative">
      <Lock
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
        aria-hidden="true"
      />
      <Input
        id={id}
        type={onToggleShow && show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required={required}
        className={onToggleShow ? 'pl-10 pr-11' : 'pl-10'}
        placeholder="••••••••"
        {...props}
      />
      {onToggleShow && (
        <IconButton
          icon={show ? EyeOff : Eye}
          label={show ? 'Jelszó elrejtése' : 'Jelszó megjelenítése'}
          size="sm"
          onClick={onToggleShow}
          className="absolute right-2 top-1/2 -translate-y-1/2"
        />
      )}
    </div>
  )
}

export default function Profile({ session }) {
  const [loading, setLoading] = useState(false)
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

      toast.success('Profil sikeresen frissítve!')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Hiba történt a profil frissítésekor')
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setLoading(true)

    // Validation
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Az új jelszavak nem egyeznek!')
      setLoading(false)
      return
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('A jelszónak legalább 6 karakter hosszúnak kell lennie!')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      })

      if (error) throw error

      toast.success('Jelszó sikeresen megváltoztatva!')
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setShowPasswordFields(false)
    } catch (error) {
      console.error('Error changing password:', error)
      toast.error(error.message || 'Hiba történt a jelszó változtatásakor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-4 sm:p-6">
      <PageHeader
        title="Profil"
        description="Kezeld a fiókod adatait és biztonsági beállításait"
      />

      <div className="space-y-6">
        {/* Profile Information */}
        <Panel title="Profil információk" icon={User}>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <Field label="Email cím" htmlFor="profile-email" hint="Az email cím nem változtatható">
              <Input id="profile-email" type="email" value={session.user.email} disabled />
            </Field>

            <Field label="Teljes név" htmlFor="profile-name">
              <Input
                id="profile-name"
                type="text"
                value={profileForm.full_name}
                onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                placeholder="pl. Kiss János"
              />
            </Field>

            <Field label="Titulus" htmlFor="profile-role">
              <Select
                id="profile-role"
                value={profileForm.role}
                onChange={(e) => setProfileForm({ ...profileForm, role: e.target.value })}
              >
                <option value="coach">Edző</option>
                <option value="fitness_coach">Erőnléti edző</option>
                <option value="physiotherapist">Fizioterapeuta</option>
              </Select>
            </Field>

            <div className="pt-2">
              <Button type="submit" variant="primary" icon={Save} loading={loading}>
                {loading ? 'Mentés...' : 'Profil Mentése'}
              </Button>
            </div>
          </form>
        </Panel>

        {/* Security */}
        <Panel title="Biztonság" icon={Shield}>
          {!showPasswordFields ? (
            <Button icon={Lock} onClick={() => setShowPasswordFields(true)}>
              Jelszó Megváltoztatása
            </Button>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <Field label="Jelenlegi jelszó" htmlFor="profile-current-password">
                <PasswordInput
                  id="profile-current-password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                  }
                  show={showCurrentPassword}
                  onToggleShow={() => setShowCurrentPassword(!showCurrentPassword)}
                />
              </Field>

              <Field label="Új jelszó" htmlFor="profile-new-password" hint="Legalább 6 karakter">
                <PasswordInput
                  id="profile-new-password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  show={showNewPassword}
                  onToggleShow={() => setShowNewPassword(!showNewPassword)}
                />
              </Field>

              <Field label="Új jelszó megerősítése" htmlFor="profile-confirm-password">
                <PasswordInput
                  id="profile-confirm-password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                  }
                  required
                />
              </Field>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                <Button type="submit" variant="primary" icon={Save} loading={loading}>
                  {loading ? 'Mentés...' : 'Jelszó Mentése'}
                </Button>
                <Button
                  onClick={() => {
                    setShowPasswordFields(false)
                    setPasswordForm({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    })
                  }}
                >
                  Mégse
                </Button>
              </div>
            </form>
          )}
        </Panel>

        {/* Account Info */}
        <Panel title="Fiók információk" icon={IdCard}>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between border-b border-line py-2">
              <span className="text-muted">Fiók létrehozva</span>
              <span className="text-fg">
                {new Date(session.user.created_at).toLocaleDateString('hu-HU')}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-line py-2">
              <span className="text-muted">Utolsó bejelentkezés</span>
              <span className="text-fg">
                {session.user.last_sign_in_at
                  ? new Date(session.user.last_sign_in_at).toLocaleDateString('hu-HU')
                  : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted">Felhasználó ID</span>
              <span className="font-mono text-xs text-fg">{session.user.id.slice(0, 8)}...</span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
