// Widget: "Mérés-trend" — egy játékos vagy a csapatátlag heti alakulása egy
// mérési gyakorlatban. Beállítás: who ('team' | játékos id), ex (gyakorlat id), per ('8'|'26'|'52' hét).
import { useQuery } from '@tanstack/react-query'
import { TrendingUp } from 'lucide-react'
import WidgetCard from '../WidgetCard'
import { useTeams } from '../../../context/TeamContext'
import { useExercises } from '../../../hooks/useExercises'
import { usePlayers } from '../../../hooks/usePlayers'
import { useThemeColors } from '../../../hooks/useThemeColors'
import { supabase } from '../../../lib/supabase'
import { todayIso } from '../../../lib/availability'
import { weeklyAverage } from '../../../lib/trend'
import LoadingSpinner from '../../../components/LoadingSpinner'

const W = 320
const H = 120

export default function MeasurementTrendWidget({ settings = {} }) {
  const { selectedTeam } = useTeams()
  const { data: exercises = [] } = useExercises()
  const { data: players = [] } = usePlayers(selectedTeam?.id)
  const colors = useThemeColors()
  const weeks = parseInt(settings.per || '8', 10)
  const exerciseId = settings.ex || exercises[0]?.id
  const exercise = exercises.find((e) => e.id === exerciseId)
  const who = settings.who || 'team'

  const { data: points = [], isLoading } = useQuery({
    queryKey: ['widget', 'measurement_trend', selectedTeam?.id, exerciseId, who, weeks],
    queryFn: async () => {
      let q = supabase.from('measurements').select('value, measured_at').eq('team_id', selectedTeam.id).eq('exercise_id', exerciseId)
      if (who !== 'team') q = q.eq('player_id', who)
      const { data, error } = await q.order('measured_at', { ascending: true })
      if (error) throw error
      return weeklyAverage(data || [], { weeks, today: todayIso() })
    },
    enabled: !!selectedTeam?.id && !!exerciseId,
  })

  const subject = who === 'team' ? 'Csapatátlag' : players.find((p) => p.id === who)?.name ?? 'Játékos'
  const accent = colors.accent ?? 'currentColor'
  const muted = colors.muted ?? 'currentColor'

  let chart = null
  if (points.length > 0) {
    const values = points.map((p) => p.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const pad = (max - min) * 0.15 || 1
    const x = (i) => (points.length === 1 ? W / 2 : 8 + (i * (W - 16)) / (points.length - 1))
    const y = (v) => 8 + ((max + pad - v) / (max - min + 2 * pad)) * (H - 24)
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
    const last = points[points.length - 1]
    chart = (
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label={`${subject} ${exercise?.name ?? ''} trend`}>
        <path d={d} fill="none" stroke={accent} strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => (
          <circle key={p.weekStart} cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 4 : 2.5} fill={accent} />
        ))}
        <text x={W - 4} y={H - 4} textAnchor="end" fontSize="11" fill={muted}>
          {last.value} {exercise?.unit ?? ''}
        </text>
      </svg>
    )
  }

  return (
    <WidgetCard icon={TrendingUp} title="Mérés-trend">
      <p className="mb-1 truncate text-[12px] text-muted">
        {subject} · {exercise?.name ?? 'válassz gyakorlatot a beállításokban'} · {weeks} hét
      </p>
      {isLoading ? (
        <LoadingSpinner size="xs" />
      ) : !exerciseId ? (
        <p className="text-sm text-muted">Nincs mérési gyakorlat.</p>
      ) : points.length === 0 ? (
        <p className="text-sm text-muted">Nincs mérés ebben az időszakban.</p>
      ) : (
        <div className="h-[calc(100%-1.5rem)] min-h-[80px]">{chart}</div>
      )}
    </WidgetCard>
  )
}
