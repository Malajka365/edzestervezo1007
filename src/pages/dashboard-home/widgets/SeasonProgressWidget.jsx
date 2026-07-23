// src/pages/dashboard-home/widgets/SeasonProgressWidget.jsx
//
// Widget: "Szezon-állás" — aktuális szezon: hányadik hét / összes.
//
// `training_seasons` (team_id, name, start_date, end_date) — oszlopnevek
// `src/pages/macrocycle/useMacrocycleData.js` createSeason/updateSeason
// insert/update alakjából verifikálva. "Aktuális" szezon: amelyiknél
// start_date <= ma <= end_date; ha nincs ilyen, a legutóbb kezdődő (legfrissebb
// start_date szerinti) szezon.
import { useQuery } from '@tanstack/react-query'
import { CalendarRange } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useTeams } from '../../../context/TeamContext'
import LoadingSpinner from '../../../components/LoadingSpinner'
import WidgetCard from '../WidgetCard'

const DAY_MS = 24 * 60 * 60 * 1000

export default function SeasonProgressWidget() {
  const { selectedTeam } = useTeams()

  const { data: season, isLoading, isError } = useQuery({
    queryKey: ['widget', 'season_progress', selectedTeam?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_seasons')
        .select('id, name, start_date, end_date')
        .eq('team_id', selectedTeam.id)
        .order('start_date', { ascending: false })

      if (error) throw error
      if (!data || data.length === 0) return null

      const todayStr = new Date().toISOString().split('T')[0]
      const active = data.find((s) => s.start_date <= todayStr && todayStr <= s.end_date)
      return active || data[0]
    },
    enabled: !!selectedTeam?.id,
  })

  let currentWeek = 0
  let totalWeeks = 0
  let progressPct = 0

  if (season) {
    const start = new Date(season.start_date)
    const end = new Date(season.end_date)
    const today = new Date()
    totalWeeks = Math.max(1, Math.ceil((end - start) / (7 * DAY_MS)))
    const rawWeek = Math.floor((today - start) / (7 * DAY_MS)) + 1
    currentWeek = Math.min(Math.max(rawWeek, 0), totalWeeks)
    progressPct = Math.min(100, Math.max(0, (currentWeek / totalWeeks) * 100))
  }

  return (
    <WidgetCard icon={CalendarRange} title="Szezon-állás">
      {isLoading ? (
        <LoadingSpinner size="xs" />
      ) : isError ? (
        <p className="text-sm text-red-400">Nem sikerült betölteni</p>
      ) : !season ? (
        <p className="text-sm text-slate-400">Nincs aktív szezon.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-white font-medium text-sm truncate">{season.name}</p>
          <p className="text-sm text-slate-300">
            {currentWeek === 0 ? 'Még nem kezdődött el' : `${currentWeek}. hét / ${totalWeeks}`}
          </p>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}
    </WidgetCard>
  )
}
