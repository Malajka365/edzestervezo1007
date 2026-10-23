import { useTeams } from '../../context/TeamContext'
import { filterNav, getNavForRole } from '../../lib/navigation'

// Az aktuális szerepkörhöz és jogosultságokhoz szűrt menücsoportok.
export function useNavGroups() {
  const { currentUserRole, currentUserPermissions, permissionsLoading } = useTeams()
  return filterNav(getNavForRole(currentUserRole), currentUserPermissions, permissionsLoading)
}
