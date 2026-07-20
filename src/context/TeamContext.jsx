import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const TeamContext = createContext()

export function TeamProvider({ children, session }) {
  const [teams, setTeams] = useState([])
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState(null)
  const [currentUserPermissions, setCurrentUserPermissions] = useState({})

  useEffect(() => {
    if (session?.user?.id) {
      fetchTeams()
    }
  }, [session])

  useEffect(() => {
    if (selectedTeam?.id && session?.user?.id) {
      fetchRoleAndPermissions(selectedTeam.id)
    } else {
      setCurrentUserRole(null)
      setCurrentUserPermissions({})
    }
  }, [selectedTeam, session])

  const fetchTeams = async () => {
    try {
      setLoading(true)
      const { data: memberships, error: memberError } = await supabase
        .from('team_members')
        .select('team_id, role, teams(*)')
        .eq('user_id', session.user.id)

      if (memberError) throw memberError

      const teamList = (memberships || [])
        .map((m) => m.teams)
        .filter(Boolean)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      setTeams(teamList)

      if (!selectedTeam && teamList.length > 0) {
        setSelectedTeam(teamList[0])
      }
    } catch (error) {
      console.error('Error fetching teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRoleAndPermissions = async (teamId) => {
    try {
      const { data: memberRow, error: memberError } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', teamId)
        .eq('user_id', session.user.id)
        .single()

      if (memberError) throw memberError

      setCurrentUserRole(memberRow.role)

      const { data: permRows, error: permError } = await supabase
        .from('team_module_permissions')
        .select('module_key, access_level')
        .eq('team_id', teamId)
        .eq('role', memberRow.role)

      if (permError) throw permError

      const permMap = {}
      for (const row of permRows || []) {
        permMap[row.module_key] = row.access_level
      }
      setCurrentUserPermissions(permMap)
    } catch (error) {
      console.error('Error fetching role/permissions:', error)
      setCurrentUserRole(null)
      setCurrentUserPermissions({})
    }
  }

  const createTeam = async (teamData) => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .insert([{ ...teamData, created_by: session.user.id }])
        .select()
        .single()

      if (error) throw error

      setTeams([data, ...teams])
      setSelectedTeam(data)
      return { success: true, data }
    } catch (error) {
      console.error('Error creating team:', error)
      return { success: false, error: error.message }
    }
  }

  const updateTeam = async (teamId, teamData) => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .update({ ...teamData, updated_at: new Date().toISOString() })
        .eq('id', teamId)
        .select()
        .single()

      if (error) throw error

      setTeams(teams.map((t) => (t.id === teamId ? data : t)))
      if (selectedTeam?.id === teamId) {
        setSelectedTeam(data)
      }
      return { success: true, data }
    } catch (error) {
      console.error('Error updating team:', error)
      return { success: false, error: error.message }
    }
  }

  const deleteTeam = async (teamId) => {
    try {
      const { error } = await supabase.from('teams').delete().eq('id', teamId)

      if (error) throw error

      const newTeams = teams.filter((t) => t.id !== teamId)
      setTeams(newTeams)

      if (selectedTeam?.id === teamId) {
        setSelectedTeam(newTeams.length > 0 ? newTeams[0] : null)
      }
      return { success: true }
    } catch (error) {
      console.error('Error deleting team:', error)
      return { success: false, error: error.message }
    }
  }

  const value = {
    teams,
    selectedTeam,
    setSelectedTeam,
    loading,
    fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    currentUserRole,
    currentUserPermissions,
    isTeamOwner: selectedTeam?.created_by === session?.user?.id,
  }

  return <TeamContext.Provider value={value}>{children}</TeamContext.Provider>
}

export function useTeams() {
  const context = useContext(TeamContext)
  if (!context) {
    throw new Error('useTeams must be used within TeamProvider')
  }
  return context
}
