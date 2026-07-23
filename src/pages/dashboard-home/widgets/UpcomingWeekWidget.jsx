// src/pages/dashboard-home/widgets/UpcomingWeekWidget.jsx
//
// Widget: "Következő 7 nap" — training_sessions + matches (ma + 7 nap), időrendben.
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Dumbbell, Medal } from 'lucide-react'
import WidgetCard from '../WidgetCard'
import { useTeams } from '../../../context/TeamContext'
import { supabase } from '../../../lib/supabase'
import LoadingSpinner from '../../../components/LoadingSpinner'

const TRAINING_TYPE_LABELS = {
  gym: 'Konditerem',
  ball: 'Labdás edzés',
  tactic: 'Taktika & Technika',
  other: 'Egyéb',
}

const formatShortDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric', weekday: 'short' })

function useUpcomingWeek(teamId) {
  return useQuery({
    queryKey: ['widget', 'upcoming_week', teamId],
    queryFn: async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const start = new Date(today)
      const end = new Date(today)
      end.setDate(end.getDate() + 7)

      const startKey = start.toISOString().split('T')[0]
      const endKey = end.toISOString().split('T')[0]

      const [sessionsRes, matchesRes] = await Promise.all([
        supabase
          .from('training_sessions')
          .select('id, date, start_time, type, location')
          .eq('team_id', teamId)
          .gte('date', startKey)
          .lt('date', endKey)
          .order('date', { ascending: true }),
        supabase
          .from('matches')
          .select('id, date, time, opponent')
          .eq('team_id', teamId)
          .gte('date', startKey)
          .lt('date', endKey)
          .order('date', { ascending: true }),
      ])

      if (sessionsRes.error) throw sessionsRes.error
      if (matchesRes.error) throw matchesRes.error

      const sessionItems = (sessionsRes.data || []).map((s) => ({
        id: `session-${s.id}`,
        date: s.date,
        time: s.start_time || '',
        kind: 'session',
        title: TRAINING_TYPE_LABELS[s.type] || 'Edzés',
      }))

      const matchItems = (matchesRes.data || []).map((m) => ({
        id: `match-${m.id}`,
        date: m.date,
        time: m.time || '',
        kind: 'match',
        title: `vs ${m.opponent || '(Ellenfél nincs megadva)'}`,
      }))

      return [...sessionItems, ...matchItems]
        .sort((a, b) => {
          const dateCmp = a.date.localeCompare(b.date)
          if (dateCmp !== 0) return dateCmp
          return (a.time || '').localeCompare(b.time || '')
        })
        .slice(0, 6)
    },
    enabled: !!teamId,
  })
}

export default function UpcomingWeekWidget() {
  const { selectedTeam } = useTeams()
  const { data: items, isLoading, error } = useUpcomingWeek(selectedTeam?.id)

  return (
    <WidgetCard icon={CalendarDays} title="Következő 7 nap">
      {isLoading ? (
        <LoadingSpinner size="xs" />
      ) : error ? (
        <p className="text-sm text-red-400">Nem sikerült betölteni</p>
      ) : !items || items.length === 0 ? (
        <p className="text-sm text-slate-400">Nincs esemény a következő 7 napban.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const Icon = item.kind === 'match' ? Medal : Dumbbell
            return (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-slate-400 flex-shrink-0">{formatShortDate(item.date)}</span>
                <span className="text-slate-300 truncate">{item.title}</span>
              </li>
            )
          })}
        </ul>
      )}
    </WidgetCard>
  )
}
