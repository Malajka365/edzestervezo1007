// src/pages/dashboard-home/widgets/TeamOverviewWidget.jsx
//
// Widget: "Csapat-áttekintő" — játékosszám + tagok szerepkörönként.
//
// Játékosszám: a megosztott, gyorsítótárazott usePlayers hook (src/hooks/usePlayers.js).
// Tagok szerepkörönként: `team_members` (team_id, role) — oszlopok
// `src/context/TeamContext.jsx` fetchTeams/fetchRoleAndPermissions lekérdezéséből
// verifikálva; a szerepkör-címkék `ROLES`-ból (src/lib/permissions.js).
import { useQuery } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useTeams } from '../../../context/TeamContext'
import { usePlayers } from '../../../hooks/usePlayers'
import { ROLES } from '../../../lib/permissions'
import LoadingSpinner from '../../../components/LoadingSpinner'
import WidgetCard from '../WidgetCard'

export default function TeamOverviewWidget() {
  const { selectedTeam } = useTeams()

  const { data: players = [], isLoading: playersLoading, isError: playersError } = usePlayers(
    selectedTeam?.id
  )

  const { data: roleCounts = [], isLoading: membersLoading, isError: membersError } = useQuery({
    queryKey: ['widget', 'team_overview', selectedTeam?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', selectedTeam.id)

      if (error) throw error

      const counts = {}
      for (const row of data || []) {
        counts[row.role] = (counts[row.role] || 0) + 1
      }
      return ROLES.map((r) => ({ key: r.key, name: r.name, count: counts[r.key] || 0 })).filter(
        (r) => r.count > 0
      )
    },
    enabled: !!selectedTeam?.id,
  })

  const isLoading = playersLoading || membersLoading
  const isError = playersError || membersError

  return (
    <WidgetCard icon={Users} title="Csapat-áttekintő">
      {isLoading ? (
        <LoadingSpinner size="xs" />
      ) : isError ? (
        <p className="text-sm text-red-400">Nem sikerült betölteni</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{players.length}</p>
              <p className="text-xs text-slate-400">Játékos</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">
                {roleCounts.reduce((sum, r) => sum + r.count, 0)}
              </p>
              <p className="text-xs text-slate-400">Csapattag</p>
            </div>
          </div>

          {roleCounts.length === 0 ? (
            <p className="text-sm text-slate-400">Nincs csapattag.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {roleCounts.map((r) => (
                <li key={r.key} className="flex items-center justify-between text-slate-300">
                  <span>{r.name}</span>
                  <span className="text-white font-medium">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </WidgetCard>
  )
}
