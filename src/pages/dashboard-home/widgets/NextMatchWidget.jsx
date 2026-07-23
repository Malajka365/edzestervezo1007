// src/pages/dashboard-home/widgets/NextMatchWidget.jsx
//
// Widget: "Következő mérkőzés" — legközelebbi jövőbeli match, napok száma.
import { useQuery } from '@tanstack/react-query'
import { Medal, Home as HomeIcon, Plane } from 'lucide-react'
import WidgetCard from '../WidgetCard'
import { useTeams } from '../../../context/TeamContext'
import { supabase } from '../../../lib/supabase'
import LoadingSpinner from '../../../components/LoadingSpinner'

function useNextMatch(teamId) {
  return useQuery({
    queryKey: ['widget', 'next_match', teamId],
    queryFn: async () => {
      const todayKey = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('matches')
        .select('id, date, time, opponent, home_away')
        .eq('team_id', teamId)
        .gte('date', todayKey)
        .order('date', { ascending: true })
        .limit(1)

      if (error) throw error
      return data?.[0] || null
    },
    enabled: !!teamId,
  })
}

const daysUntil = (dateStr) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target - today) / (1000 * 60 * 60 * 24))
}

export default function NextMatchWidget() {
  const { selectedTeam } = useTeams()
  const { data: match, isLoading, error } = useNextMatch(selectedTeam?.id)

  return (
    <WidgetCard icon={Medal} title="Következő mérkőzés">
      {isLoading ? (
        <LoadingSpinner size="xs" />
      ) : error ? (
        <p className="text-sm text-red-400">Nem sikerült betölteni</p>
      ) : !match ? (
        <p className="text-sm text-slate-400">Nincs közelgő mérkőzés.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-base font-semibold text-white truncate">
            vs {match.opponent || '(Ellenfél nincs megadva)'}
          </p>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            {match.home_away === 'home' ? (
              <HomeIcon className="w-4 h-4 text-green-500" />
            ) : (
              <Plane className="w-4 h-4 text-blue-500" />
            )}
            <span>{match.home_away === 'home' ? 'Hazai' : 'Idegen'}</span>
            <span className="text-slate-600">•</span>
            <span>
              {new Date(match.date).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}
              {match.time ? ` ${match.time}` : ''}
            </span>
          </div>
          <p className="text-sm text-primary-400 font-medium">
            {daysUntil(match.date) === 0 ? 'Ma!' : `${daysUntil(match.date)} nap múlva`}
          </p>
        </div>
      )}
    </WidgetCard>
  )
}
