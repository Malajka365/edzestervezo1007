// src/pages/dashboard-home/widgets/RecentMeasurementsWidget.jsx
//
// Widget: "Friss mérések" — a legutóbbi n mérés, egyéni csúccsal jelölve.
// Beállítás: n ('3' | '5' | '8'). A csúcs a betöltött utolsó 200 mérésből számolt.
import { useQuery } from '@tanstack/react-query'
import { BarChart3 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useTeams } from '../../../context/TeamContext'
import { markPersonalBests } from '../../../lib/widgetData'
import LoadingSpinner from '../../../components/LoadingSpinner'
import StatusPill from '../../../components/ui/StatusPill'
import WidgetCard from '../WidgetCard'

export default function RecentMeasurementsWidget({ settings = {} }) {
  const { selectedTeam } = useTeams()
  const n = parseInt(settings.n || '5', 10)
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ['widget', 'recent_measurements', selectedTeam?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('measurements')
        .select('id, value, reps, measured_at, player:players(id, name), exercise:exercises(id, name, unit)')
        .eq('team_id', selectedTeam.id)
        .order('measured_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data || []
    },
    enabled: !!selectedTeam?.id,
  })
  const measurements = markPersonalBests(rows, n)

  return (
    <WidgetCard icon={BarChart3} title="Friss mérések">
      {isLoading ? (
        <LoadingSpinner size="xs" />
      ) : isError ? (
        <p className="text-sm text-bad">Nem sikerült betölteni</p>
      ) : measurements.length === 0 ? (
        <p className="text-sm text-muted">Még nincs mérés.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {measurements.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 text-fg">
              <span className="min-w-0 truncate">
                <span className="font-medium text-fg">{m.player?.name || '—'}</span>
                {' · '}
                <span className="text-muted">{m.exercise?.name || '—'}</span>
              </span>
              <span className="flex flex-shrink-0 items-center gap-2 text-muted">
                <span className="font-semibold text-fg">
                  {m.value} {m.exercise?.unit}
                </span>
                {m.isBest && <StatusPill status="ok">csúcs</StatusPill>}
                <span className="hidden sm:inline">{new Date(m.measured_at).toLocaleDateString('hu-HU')}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  )
}
