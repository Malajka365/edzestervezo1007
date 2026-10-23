// src/components/TeamMembersPanel.jsx

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ROLES, MODULES, ACCESS_LEVELS } from '../lib/permissions'
import { UserPlus, Trash2, Copy, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmDialog from './ui/ConfirmDialog'
import LoadingSpinner from './LoadingSpinner'
import Button from './ui/Button'
import IconButton from './ui/IconButton'
import Modal from './ui/Modal'
import Panel from './ui/Panel'
import StatusPill from './ui/StatusPill'
import { Field, Input, Select } from './ui/Field'

export default function TeamMembersPanel({ team, isOwner }) {
  const [members, setMembers] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteRole, setInviteRole] = useState('fitness_coach')
  const [inviteEmail, setInviteEmail] = useState('')
  const [generatedLink, setGeneratedLink] = useState(null)
  const [permissions, setPermissions] = useState({}) // { [role]: { [module_key]: access_level } }
  const [savingPermissions, setSavingPermissions] = useState(false)
  const [confirmState, setConfirmState] = useState(null)

  useEffect(() => {
    if (team?.id) {
      fetchMembersAndInvites()
    }
  }, [team])

  const fetchMembersAndInvites = async () => {
    try {
      setLoading(true)
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('id, user_id, role, joined_at')
        .eq('team_id', team.id)
        .order('joined_at', { ascending: true })

      if (memberError) throw memberError

      let membersWithProfiles = memberData || []
      if (membersWithProfiles.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', membersWithProfiles.map((m) => m.user_id))

        if (profileError) throw profileError

        const profileMap = {}
        for (const p of profileData || []) {
          profileMap[p.id] = p
        }

        membersWithProfiles = membersWithProfiles.map((m) => ({
          ...m,
          profiles: profileMap[m.user_id]
            ? { email: profileMap[m.user_id].email, full_name: profileMap[m.user_id].full_name }
            : null,
        }))
      }

      setMembers(membersWithProfiles)

      if (isOwner) {
        const { data: inviteData, error: inviteError } = await supabase
          .from('team_invites')
          .select('id, token, role, expires_at, created_at, invited_email')
          .eq('team_id', team.id)
          .is('used_at', null)
          .order('created_at', { ascending: false })

        if (inviteError) throw inviteError
        setPendingInvites(inviteData || [])

        const { data: permData, error: permError } = await supabase
          .from('team_module_permissions')
          .select('role, module_key, access_level')
          .eq('team_id', team.id)

        if (permError) throw permError

        const permMap = {}
        for (const row of permData || []) {
          if (!permMap[row.role]) permMap[row.role] = {}
          permMap[row.role][row.module_key] = row.access_level
        }
        setPermissions(permMap)
      }
    } catch (error) {
      console.error('Error fetching team members:', error)
      toast.error('Nem sikerült betölteni az adatokat. Ellenőrizd az internetkapcsolatot és frissítsd az oldalt.', { id: 'adat-betoltes' })
    } finally {
      setLoading(false)
    }
  }

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

  const handleGenerateInvite = async () => {
    try {
      const { data, error } = await supabase
        .from('team_invites')
        .insert({
          team_id: team.id,
          role: inviteRole,
          invited_email: inviteEmail.trim().toLowerCase(),
          created_by: (await supabase.auth.getUser()).data.user.id,
        })
        .select()
        .single()

      if (error) throw error

      const link = `${window.location.origin}/join/${data.token}`
      setGeneratedLink(link)
      fetchMembersAndInvites()
    } catch (error) {
      console.error('Error generating invite:', error)
      toast.error('Hiba történt a meghívó létrehozásakor')
    }
  }

  const handleRevokeInvite = (inviteId) => {
    setConfirmState({
      message: 'Biztosan visszavonod ezt a meghívót?',
      action: async () => {
        try {
          const { error } = await supabase.from('team_invites').delete().eq('id', inviteId)
          if (error) throw error
          fetchMembersAndInvites()
        } catch (error) {
          console.error('Error revoking invite:', error)
        }
      },
    })
  }

  const handleRemoveMember = (memberId) => {
    setConfirmState({
      message: 'Biztosan eltávolítod ezt a tagot a csapatból?',
      action: async () => {
        try {
          const { error } = await supabase.from('team_members').delete().eq('id', memberId)
          if (error) throw error
          fetchMembersAndInvites()
        } catch (error) {
          console.error('Error removing member:', error)
        }
      },
    })
  }

  const handlePermissionChange = (role, moduleKey, accessLevel) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: { ...prev[role], [moduleKey]: accessLevel },
    }))
  }

  const handleSavePermissions = async () => {
    setSavingPermissions(true)
    try {
      const rows = []
      for (const role of ROLES.map((r) => r.key)) {
        for (const mod of MODULES.map((m) => m.key)) {
          rows.push({
            team_id: team.id,
            role,
            module_key: mod,
            access_level: permissions[role]?.[mod] || 'none',
          })
        }
      }

      const { error } = await supabase
        .from('team_module_permissions')
        .upsert(rows, { onConflict: 'team_id,role,module_key' })

      if (error) throw error
      toast.success('Jogosultságok elmentve!')
    } catch (error) {
      console.error('Error saving permissions:', error)
      toast.error('Hiba történt a mentés során')
    } finally {
      setSavingPermissions(false)
    }
  }

  const roleLabel = (roleKey) => ROLES.find((r) => r.key === roleKey)?.name || roleKey

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink)
      toast.success('Link a vágólapra másolva')
    } catch (error) {
      console.error('Error copying invite link:', error)
      toast.error('A link másolása nem sikerült')
    }
  }

  const closeInviteForm = () => setShowInviteForm(false)

  // Egy jogosultság-választó (modul × szerepkör) – asztali és mobil nézet is ezt használja.
  const permissionSelect = (mod, r, id) => (
    <Select
      id={id}
      aria-label={`${mod.name} – ${r.name}`}
      value={permissions[r.key]?.[mod.key] || 'none'}
      onChange={(e) => handlePermissionChange(r.key, mod.key, e.target.value)}
    >
      {ACCESS_LEVELS.map((lvl) => (
        <option key={lvl.key} value={lvl.key}>
          {lvl.name}
        </option>
      ))}
    </Select>
  )

  if (loading) return <LoadingSpinner size="xs" />

  return (
    <div className="space-y-6">
      <Panel
        title="Csapattagok"
        actions={
          isOwner && (
            <Button
              variant="primary"
              icon={UserPlus}
              onClick={() => {
                setShowInviteForm(true)
                setGeneratedLink(null)
                setInviteEmail('')
              }}
            >
              Tag meghívása
            </Button>
          )
        }
      >
        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-[10px] bg-surface-2 p-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-fg">
                  {m.profiles?.full_name || m.profiles?.email}
                </p>
                <div className="mt-1">
                  <StatusPill status="neutral">{roleLabel(m.role)}</StatusPill>
                </div>
              </div>
              {isOwner && m.role !== 'coach' && (
                <IconButton
                  icon={Trash2}
                  label="Tag eltávolítása"
                  className="text-bad hover:bg-bad-soft hover:text-bad"
                  onClick={() => handleRemoveMember(m.id)}
                />
              )}
            </div>
          ))}
        </div>
      </Panel>

      {isOwner && (
        <Panel title="Jogosultságok">
          {/* Mobilon (< md): egy kártya modulonként, benne a 3 szerep legördülővel */}
          <div className="space-y-3 md:hidden">
            {MODULES.map((mod) => (
              <div key={mod.key} className="rounded-[10px] bg-surface-2 p-3">
                <p className="mb-3 font-medium text-fg">{mod.name}</p>
                <div className="space-y-2">
                  {ROLES.map((r) => (
                    <div key={r.key} className="flex items-center justify-between gap-3">
                      <label
                        htmlFor={`perm-m-${mod.key}-${r.key}`}
                        className="flex-shrink-0 text-sm text-muted"
                      >
                        {r.name}
                      </label>
                      <div className="w-40 min-w-0">
                        {permissionSelect(mod, r, `perm-m-${mod.key}-${r.key}`)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* md és afelett: eredeti táblázat nézet */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="p-2 text-left font-semibold text-muted">Modul</th>
                  {ROLES.map((r) => (
                    <th key={r.key} className="p-2 text-left font-semibold text-muted">
                      {r.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map((mod) => (
                  <tr key={mod.key} className="border-t border-line">
                    <td className="p-2 text-fg">{mod.name}</td>
                    {ROLES.map((r) => (
                      <td key={r.key} className="p-2">
                        {permissionSelect(mod, r, `perm-d-${mod.key}-${r.key}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            variant="primary"
            icon={Save}
            onClick={handleSavePermissions}
            loading={savingPermissions}
            className="mt-4 w-full sm:w-auto"
          >
            {savingPermissions ? 'Mentés...' : 'Jogosultságok mentése'}
          </Button>
        </Panel>
      )}

      {isOwner && pendingInvites.length > 0 && (
        <Panel title="Függő meghívók">
          <div className="space-y-2">
            {pendingInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between gap-3 rounded-[10px] bg-surface-2 p-3"
              >
                <div className="min-w-0">
                  <StatusPill status="neutral">{roleLabel(inv.role)}</StatusPill>
                  {inv.invited_email && (
                    <p className="mt-1 break-all text-sm text-fg">{inv.invited_email}</p>
                  )}
                  <p className="text-sm text-muted">
                    Lejár: {new Date(inv.expires_at).toLocaleDateString('hu-HU')}
                  </p>
                </div>
                <IconButton
                  icon={Trash2}
                  label="Meghívó visszavonása"
                  className="text-bad hover:bg-bad-soft hover:text-bad"
                  onClick={() => handleRevokeInvite(inv.id)}
                />
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Modal
        open={showInviteForm}
        onClose={closeInviteForm}
        title="Tag meghívása"
        size="sm"
        footer={
          !generatedLink ? (
            <>
              <Button onClick={closeInviteForm}>Mégse</Button>
              <Button
                variant="primary"
                onClick={handleGenerateInvite}
                disabled={!isValidEmail(inviteEmail)}
              >
                Meghívó link generálása
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={closeInviteForm}>
              Kész
            </Button>
          )
        }
      >
        {!generatedLink ? (
          <div className="grid gap-4">
            <Field label="Meghívott e-mail címe" htmlFor="invite-email">
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="pelda@email.hu"
                required
              />
            </Field>
            <Field label="Szerepkör" htmlFor="invite-role">
              <Select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                {ROLES.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Küldd el ezt a linket ({roleLabel(inviteRole)} szerepkörrel, 7 napig érvényes):
            </p>
            <div className="flex items-center gap-2 rounded-[10px] bg-surface-2 p-3">
              <code className="flex-1 truncate font-mono text-sm text-fg">{generatedLink}</code>
              <IconButton icon={Copy} label="Link másolása" onClick={handleCopyLink} />
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmState}
        title="Megerősítés"
        message={confirmState?.message}
        onConfirm={async () => {
          await confirmState.action()
          setConfirmState(null)
        }}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  )
}
