// src/pages/dashboard-home/widgets/LeaderboardTop3Widget.jsx
//
// Widget: "Ranglista top 3" — legjobb testsúlyarányos 1RM.
//
// `src/pages/Leaderboard.jsx` teljes logikája (testsúly-lookup a 'Testsúly'
// gyakorlathoz, majd 1RM / testsúly reláció egy KIVÁLASZTOTT gyakorlatra) egy
// exercise-selectort és 2 külön lekérdezést igényel — ez egy kompakt widgetbe
// túl sok állapot/UI. Ezért az EGYSZERŰSÍTETT fallback utat választottuk (ld.
// spec/megbízás): "Top 3 (1RM)" — a csapat 3 legjobb 1RM-értéke súly alapú
// (kg-os) gyakorlatokból, játékosonként a legjobbal (nem testsúly-arányosítva).
// A `one_rm` oszlopot NEM használjuk közvetlenül (bizalmatlan/stale lehet régi
// adatnál) — a value+reps alapján a calculate1RM segítségével újraszámoljuk,
// ugyanazzal a képlettel, mint a mérési modul.
import { useQuery } from '@tanstack/react-query'
import { Trophy } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useTeams } from '../../../context/TeamContext'
import { calculate1RM } from '../../measurements/useMeasurementsData'
import LoadingSpinner from '../../../components/LoadingSpinner'
import WidgetCard from '../WidgetCard'

export default function LeaderboardTop3Widget() {
  const { selectedTeam } = useTeams()

  const { data: top3 = [], isLoading, isError } = useQuery({
    queryKey: ['widget', 'leaderboard_top3', selectedTeam?.id],
    queryFn: async () => {
      // Egy ésszerű, friss ablakot nézünk (utolsó 200 mérés a csapatnál) —
      // ebből számoljuk a legjobb 1RM-et játékosonként, kg-os gyakorlatokra
      // szűkítve (a súly alapú, 1RM-mel értelmezhető mérések).
      const { data, error } = await supabase
        .from('measurements')
        .select(`
          value,
          reps,
          measured_at,
          player:players(id, name),
          exercise:exercises(id, name, unit)
        `)
        .eq('team_id', selectedTeam.id)
        .order('measured_at', { ascending: false })
        .limit(200)

      if (error) throw error

      const bestByPlayer = new Map()
      for (const m of data || []) {
        if (m.exercise?.unit !== 'kg' || !m.player) continue
        const oneRM = calculate1RM(parseFloat(m.value), parseInt(m.reps || 1))
        if (!oneRM) continue
        const oneRMNum = parseFloat(oneRM)
        const existing = bestByPlayer.get(m.player.id)
        if (!existing || oneRMNum > existing.oneRM) {
          bestByPlayer.set(m.player.id, {
            playerId: m.player.id,
            playerName: m.player.name,
            exerciseName: m.exercise.name,
            oneRM: oneRMNum,
          })
        }
      }

      return Array.from(bestByPlayer.values())
        .sort((a, b) => b.oneRM - a.oneRM)
        .slice(0, 3)
    },
    enabled: !!selectedTeam?.id,
  })

  const medalColor = (rank) => {
    if (rank === 1) return 'text-yellow-400'
    if (rank === 2) return 'text-slate-400'
    return 'text-amber-600'
  }

  return (
    <WidgetCard icon={Trophy} title="Ranglista top 3">
      {isLoading ? (
        <LoadingSpinner size="xs" />
      ) : isError ? (
        <p className="text-sm text-red-400">Nem sikerült betölteni</p>
      ) : top3.length === 0 ? (
        <p className="text-sm text-slate-400">Nincs elég mérési adat.</p>
      ) : (
        <div>
          <p className="text-xs text-slate-500 mb-2">Top 3 (1RM)</p>
          <ul className="space-y-2 text-sm">
            {top3.map((entry, i) => (
              <li key={entry.playerId} className="flex items-center justify-between gap-2 text-slate-300">
                <span className="min-w-0 truncate flex items-center gap-2">
                  <span className={`font-bold ${medalColor(i + 1)}`}>#{i + 1}</span>
                  <span className="text-white font-medium truncate">{entry.playerName}</span>
                  <span className="text-slate-500 text-xs truncate">{entry.exerciseName}</span>
                </span>
                <span className="flex-shrink-0 text-white font-semibold">
                  {entry.oneRM.toFixed(1)} kg
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </WidgetCard>
  )
}
