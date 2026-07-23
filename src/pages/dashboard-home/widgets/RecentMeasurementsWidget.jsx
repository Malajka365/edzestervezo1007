// src/pages/dashboard-home/widgets/RecentMeasurementsWidget.jsx
//
// Widget: "Friss mérések" — utolsó 5 measurement (játékos + gyakorlat + érték).
//
// `measurements` táblának nincs saját team_id-alapú "könnyű" lekérdezése a
// widget számára külön hook formájában — a select-alakot
// `src/pages/measurements/useMeasurementsData.js` fetchMeasurements-jéből
// tükrözzük (player + exercise embedded select), csak limit(5) + team_id szűréssel.
import { useQuery } from '@tanstack/react-query'
import { BarChart3 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useTeams } from '../../../context/TeamContext'
import LoadingSpinner from '../../../components/LoadingSpinner'
import WidgetCard from '../WidgetCard'

export default function RecentMeasurementsWidget() {
  const { selectedTeam } = useTeams()

  const { data: measurements = [], isLoading, isError } = useQuery({
    queryKey: ['widget', 'recent_measurements', selectedTeam?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('measurements')
        .select(`
          id,
          value,
          measured_at,
          player:players(id, name),
          exercise:exercises(id, name, unit)
        `)
        .eq('team_id', selectedTeam.id)
        .order('measured_at', { ascending: false })
        .limit(5)

      if (error) throw error
      return data || []
    },
    enabled: !!selectedTeam?.id,
  })

  return (
    <WidgetCard icon={BarChart3} title="Friss mérések">
      {isLoading ? (
        <LoadingSpinner size="xs" />
      ) : isError ? (
        <p className="text-sm text-red-400">Nem sikerült betölteni</p>
      ) : measurements.length === 0 ? (
        <p className="text-sm text-slate-400">Még nincs mérés.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {measurements.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 text-slate-300">
              <span className="min-w-0 truncate">
                <span className="text-white font-medium">{m.player?.name || '—'}</span>
                {' · '}
                <span className="text-slate-400">{m.exercise?.name || '—'}</span>
              </span>
              <span className="flex-shrink-0 text-slate-400 flex items-center gap-2">
                <span className="text-white font-semibold">
                  {m.value} {m.exercise?.unit}
                </span>
                <span>{new Date(m.measured_at).toLocaleDateString('hu-HU')}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  )
}
