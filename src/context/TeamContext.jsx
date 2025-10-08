import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const TeamContext = createContext()

export function TeamProvider({ children, session }) {
  const [teams, setTeams] = useState([])
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch teams on mount
  useEffect(() => {
    if (session?.user?.id) {
      fetchTeams()
    }
  }, [session])

  const fetchTeams = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('created_by', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setTeams(data || [])
      
      // Auto-select first team if none selected
      if (!selectedTeam && data && data.length > 0) {
        setSelectedTeam(data[0])
      }
    } catch (error) {
      console.error('Error fetching teams:', error)
    } finally {
      setLoading(false)
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

      setTeams(teams.map(t => t.id === teamId ? data : t))
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
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)

      if (error) throw error

      const newTeams = teams.filter(t => t.id !== teamId)
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
