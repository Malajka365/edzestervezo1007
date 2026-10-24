// src/pages/dashboard-home/widgets/LeaderboardTop3Widget.jsx
//
// Widget: "Ranglista" — a csapat legjobbjai egy választott mutatóban.
// Beállítás: metric ('rel' testsúlyarányos 1RM | 'orm' legjobb 1RM | 'att' jelenlét %),
// n ('3' | '5' | 'all'). A számítás: src/lib/widgetData.js rankPlayers.
import { useQuery } from '@tanstack/react-query'
import { Trophy } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useTeams } from '../../../context/TeamContext'
import { todayIso } from '../../../lib/availability'
import { periodStart, rankPlayers } from '../../../lib/widgetData'
import LoadingSpinner from '../../../components/LoadingSpinner'
import WidgetCard from '../WidgetCard'

const METRIC_LABEL = { rel: 'Relatív erő', orm: 'Legjobb 1RM', att: 'Jelenlét (szezon)' }
const format = (metric, v) => (metric === 'att' ? `${v}%` : metric === 'rel' ? `${v.toFixed(2).replace('.', ',')} ×` : `${v.toFixed(1)} kg`)
const RANK_TONE = ['text-accent', 'text-fg', 'text-muted']

export default function LeaderboardTop3Widget({ settings = {} }) {
  const { selectedTeam } = useTeams()
  const metric = settings.metric || 'rel'
  const n = settings.n || '3'

  const { data: ranking = [], isLoading, isError } = useQuery({
    queryKey: ['widget', 'leaderboard', selectedTeam?.id, metric, n],
    queryFn: async () => {
      if (metric === 'att') {
        const { data, error } = await supabase
          .from('player_attendance')
          .select('player_id, status, players(name)')
          .eq('team_id', selectedTeam.id)
          .gte('date', periodStart('season', todayIso()))
        if (error) throw error
        return rankPlayers({ attendance: data || [], metric, n })
      }
      const { data, error } = await supabase
        .from('measurements')
        .select('value, reps, measured_at, player:players(id, name), exercise:exercises(id, name, unit)')
        .eq('team_id', selectedTeam.id)
        .order('measured_at', { ascending: false })
        .limit(300)
      if (error) throw error
      return rankPlayers({ measurements: data || [], metric, n })
    },
    enabled: !!selectedTeam?.id,
  })

  return (
    <WidgetCard icon={Trophy} title="Ranglista">
      {isLoading ? (
        <LoadingSpinner size="xs" />
      ) : isError ? (
        <p className="text-sm text-bad">Nem sikerült betölteni</p>
      ) : ranking.length === 0 ? (
        <p className="text-sm text-muted">Nincs elég adat.</p>
      ) : (
        <div>
          <p className="mb-2 text-xs text-muted">{METRIC_LABEL[metric]}</p>
          <ol className="space-y-1.5 text-sm">
            {ranking.map((entry, i) => (
              <li key={entry.playerId} className="flex items-center gap-2 text-fg">
                <span className={`w-6 font-display text-lg font-bold ${RANK_TONE[i] ?? 'text-subtle'}`}>{i + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{entry.playerName}</span>
                <span className="flex-shrink-0 font-semibold">{format(metric, entry.value)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </WidgetCard>
  )
}
