// Teszt segéd: a TeamContext-et a megadott értékkel tölti fel, Supabase nélkül.
import { TeamContext } from '@/context/TeamContext'

export const BASE_TEAM_CONTEXT = {
  teams: [],
  selectedTeam: null,
  setSelectedTeam: () => {},
  loading: false,
  fetchTeams: async () => {},
  createTeam: async () => ({ success: true }),
  updateTeam: async () => ({ success: true }),
  deleteTeam: async () => ({ success: true }),
  currentUserRole: null,
  currentUserPermissions: {},
  permissionsLoading: false,
  isTeamOwner: false,
}

export default function TeamTestProvider({ value, children }) {
  return (
    <TeamContext.Provider value={{ ...BASE_TEAM_CONTEXT, ...value }}>{children}</TeamContext.Provider>
  )
}
