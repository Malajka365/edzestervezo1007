// Widget: "Mérési lefedettség" — ki mikor volt utoljára mérve.
// Beállítás: limit ('4' | '6' | '8' hét) — ennél régebben mért játékos piros.
import { useQuery } from '@tanstack/react-query'
import { Gauge } from 'lucide-react'
import WidgetCard from '../WidgetCard'
import StatusPill from '../../../components/ui/StatusPill'
import { useTeams } from '../../../context/TeamContext'
import { usePlayers } from '../../../hooks/usePlayers'
import { supabase } from '../../../lib/supabase'
import LoadingSpinner from '../../../components/LoadingSpinner'

const WEEK = 7 * 24 * 60 * 60 * 1000

export default function MeasurementCoverageWidget({ settings = {} }) {
  const { selectedTeam } = useTeams()
  const { data: players = [] } = usePlayers(selectedTeam?.id)
  const limit = parseInt(settings.limit || '6', 10)

  const { data: last = new Map(), isLoading } = useQuery({
    queryKey: ['widget', 'measurement_coverage', selectedTeam?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('measurements')
        .select('player_id, measured_at')
        .eq('team_id', selectedTeam.id)
        .order('measured_at', { ascending: false })
        .limit(1000)
      if (error) throw error
      const map = new Map()
      for (const m of data || []) if (!map.has(m.player_id)) map.set(m.player_id, m.measured_at)
      return map
    },
    enabled: !!selectedTeam?.id,
  })

  const rows = players
    .map((p) => {
      const at = last.get(p.id)
      return { player: p, weeks: at ? Math.floor((Date.now() - new Date(at).getTime()) / WEEK) : null }
    })
    .sort((a, b) => (b.weeks ?? 999) - (a.weeks ?? 999))

  return (
    <WidgetCard icon={Gauge} title="Mérési lefedettség">
      {isLoading ? (
        <LoadingSpinner size="xs" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">Nincs játékos.</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map(({ player, weeks }) => {
            const tone = weeks === null || weeks >= limit ? 'bad' : weeks >= limit - 2 ? 'warn' : 'ok'
            return (
              <li key={player.id} className="flex items-center gap-2 py-1.5 text-sm">
                <span className="min-w-0 flex-1 truncate text-fg">{player.name}</span>
                <StatusPill status={tone}>{weeks === null ? 'nincs mérés' : weeks === 0 ? 'e héten' : `${weeks} hete`}</StatusPill>
              </li>
            )
          })}
        </ul>
      )}
    </WidgetCard>
  )
}
