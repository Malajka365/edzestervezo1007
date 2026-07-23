// src/components/TeamMembersPanel.jsx

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ROLES, MODULES, ACCESS_LEVELS } from '../lib/permissions'
import { UserPlus, Trash2, Copy, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TeamMembersPanel({ team, isOwner }) {
  const [members, setMembers] = useState([])
  const [pendingInvites, setPendingInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteRole, setInviteRole] = useState('fitness_coach')
  const [generatedLink, setGeneratedLink] = useState(null)
  const [permissions, setPermissions] = useState({}) // { [role]: { [module_key]: access_level } }
  const [savingPermissions, setSavingPermissions] = useState(false)

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
          .select('id, token, role, expires_at, created_at')
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

  const handleGenerateInvite = async () => {
    try {
      const { data, error } = await supabase
        .from('team_invites')
        .insert({ team_id: team.id, role: inviteRole, created_by: (await supabase.auth.getUser()).data.user.id })
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

  const handleRevokeInvite = async (inviteId) => {
    if (!confirm('Biztosan visszavonod ezt a meghívót?')) return
    try {
      const { error } = await supabase.from('team_invites').delete().eq('id', inviteId)
      if (error) throw error
      fetchMembersAndInvites()
    } catch (error) {
      console.error('Error revoking invite:', error)
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Biztosan eltávolítod ezt a tagot a csapatból?')) return
    try {
      const { error } = await supabase.from('team_members').delete().eq('id', memberId)
      if (error) throw error
      fetchMembersAndInvites()
    } catch (error) {
      console.error('Error removing member:', error)
    }
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

  if (loading) return <div className="text-slate-400 text-sm">Betöltés...</div>

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Csapattagok</h3>
          {isOwner && (
            <button
              onClick={() => {
                setShowInviteForm(true)
                setGeneratedLink(null)
              }}
              className="btn btn-primary flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> Tag meghívása
            </button>
          )}
        </div>

        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div>
                <p className="text-white font-medium">{m.profiles?.full_name || m.profiles?.email}</p>
                <p className="text-sm text-slate-400">{roleLabel(m.role)}</p>
              </div>
              {isOwner && m.role !== 'coach' && (
                <button onClick={() => handleRemoveMember(m.id)} className="p-2 hover:bg-slate-600 rounded-lg">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {isOwner && (
        <div className="card">
          <h3 className="text-lg font-bold text-white mb-4">Jogosultságok</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left text-slate-400 p-2">Modul</th>
                  {ROLES.map((r) => (
                    <th key={r.key} className="text-left text-slate-400 p-2">
                      {r.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map((mod) => (
                  <tr key={mod.key} className="border-t border-slate-700">
                    <td className="p-2 text-white">{mod.name}</td>
                    {ROLES.map((r) => (
                      <td key={r.key} className="p-2">
                        <select
                          value={permissions[r.key]?.[mod.key] || 'none'}
                          onChange={(e) => handlePermissionChange(r.key, mod.key, e.target.value)}
                          className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                        >
                          {ACCESS_LEVELS.map((lvl) => (
                            <option key={lvl.key} value={lvl.key}>
                              {lvl.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={handleSavePermissions}
            disabled={savingPermissions}
            className="btn btn-primary mt-4 disabled:opacity-50"
          >
            {savingPermissions ? 'Mentés...' : 'Jogosultságok mentése'}
          </button>
        </div>
      )}

      {isOwner && pendingInvites.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold text-white mb-4">Függő meghívók</h3>
          <div className="space-y-2">
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div>
                  <p className="text-white font-medium">{roleLabel(inv.role)}</p>
                  <p className="text-sm text-slate-400">
                    Lejár: {new Date(inv.expires_at).toLocaleDateString('hu-HU')}
                  </p>
                </div>
                <button onClick={() => handleRevokeInvite(inv.id)} className="p-2 hover:bg-slate-600 rounded-lg">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showInviteForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Tag meghívása</h3>
              <button onClick={() => setShowInviteForm(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {!generatedLink ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Szerepkör</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  >
                    {ROLES.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button onClick={handleGenerateInvite} className="btn btn-primary w-full">
                  Meghívó link generálása
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-400">
                  Küldd el ezt a linket ({roleLabel(inviteRole)} szerepkörrel, 7 napig érvényes):
                </p>
                <div className="flex items-center gap-2 p-3 bg-slate-700 rounded-lg">
                  <code className="text-sm text-white flex-1 truncate">{generatedLink}</code>
                  <button
                    onClick={() => navigator.clipboard.writeText(generatedLink)}
                    className="p-2 hover:bg-slate-600 rounded-lg"
                  >
                    <Copy className="w-4 h-4 text-slate-300" />
                  </button>
                </div>
                <button onClick={() => setShowInviteForm(false)} className="btn btn-primary w-full">
                  Kész
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
